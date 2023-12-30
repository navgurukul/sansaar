const cheerio = require('cheerio');

const strapiToMerakiConverter = (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const translatedData = [];

  $('h2, h4, p, pre, ol, ul, strong, em, img, div[data-youtube-video], iframe, table').each((index, element) => {
    const elementType = element.tagName;
    const elementText = $(element).text().trim();

    if (elementType === 'p' && elementText === '') {
      // Skip empty <p> tags
      return;
    }

    switch (elementType) {
      case 'h2':
        translatedData.push({
          component: 'header',
          variant: 2,
          value: elementText,
        });
        break;

      case 'h4':
        translatedData.push({
          component: 'header',
          variant: 4,
          value: elementText,
        });
        break;

      case 'p':
        const isNested = $(element).parents('p').length > 0; // Check if 'p' tag is nested

        if (!isNested) {
          translatedData.push(...extractTextFromPTag($(element)));
        }
        break;

      case 'ol':
      case 'ul':
        translatedData.push(...extractListItems(element));
        break;

      // case 'strong':
      //   translatedData.push({
      //     component: 'text',
      //     value: $(element).text().trim(),
      //     bold: true,
      //   });
      //   break;

      // case 'em':
      //   translatedData.push({
      //     component: 'text',
      //     value: $(element).text().trim(),
      //     italic: true,
      //   });
      //   break;

      case 'img':
        const imageUrl = $(element).attr('src');
        if (imageUrl) {
          translatedData.push({
            component: 'image',
            value: imageUrl,
            alt: '', // You can modify this based on alt text availability
          });
        }
        break;

      case 'iframe':
        const iframeSrc = $(element).attr('src');
        if (iframeSrc) {
          const videoId = extractYoutubeVideoId(iframeSrc);
          if (videoId) {
            translatedData.push({
              component: 'youtube',
              value: videoId,
            });
          }
        }
        break;



      case 'pre':
        const codeElement = $(element).find('code');
        const codeContent = codeElement.length ? codeElement.text().trim() : $(element).text().trim();
        const isJavaScript = /(?:\b(?:var|let|const|console)\b|=>|\{|\}|\/\/|\/\*)/g.test(codeContent);

        if (codeContent) {
          translatedData.push({
            component: 'code',
            type: isJavaScript ? 'javascript' : 'python',
            title: '',
            value: codeContent.replace(/ {2,4,8,12,16,20}/g, (match) => '\t'.repeat(match.length / 4)).replace(/\n/g, '<br>'),
          });
        }
        break;



      case 'table':
        const tableData = createTableStructure(element);
        translatedData.push(tableData);
        break;


      default:
      // Ignore unknown types
    }
  });

  return translatedData;
};


// BOLD & ITALIC DATA
function formatText(element) {
  const $ = cheerio.load(element.html());

  let formattedText = '';
  // Process each child node
  element.contents().each((index, child) => {
    if (child.type === 'tag') {
      const tagName = child.name.toLowerCase();

      // Handle <strong> (bold) and <em> (italic) tags
      switch (tagName) {
        case 'strong':
          formattedText += '<b>' + formatText($(child)) + '</b>';
          break;
        case 'em':
          formattedText += '<i>' + formatText($(child)) + '</i>';
          break;
        default:
          // Process other tags
          formattedText += formatText($(child));
          break;
      }
    } else if (child.type === 'text') {
      // Handle text nodes
      formattedText += child.nodeValue.trim();
    }
  });

  return formattedText;
}

// P TAG DATA
function extractTextFromPTag(element) {
  const $ = cheerio.load('<root>' + element.html() + '</root>');
  const pTagData = [];

  // Check if the 'p' tag is directly inside another tag
  const isNested = element.parents().not('html, body').length > 0;

  // Recursively process child nodes
  element.contents().each((index, child) => {
    if (child.type === 'tag') {
      pTagData.push(...extractTextFromPTag($(child))); // Spread the result into the array
    } else if (child.type === 'text') {
      // Handle text nodes
      const formattedText = formatText(element);
      if (formattedText) {
        pTagData.push({
          component: 'text',
          value: formattedText,
        });
      }
    }
  });

  return pTagData;
}

// // ORDERED AND UNORDERED LISTS DATA
function extractListItems(list) {
  const items = [];
  const $ = cheerio.load(list);
  const isOrdered = $(list).is('ol');

  $(list).children('li').each((index, li) => {
    const textValue = $(li).text().trim();
    // Check if the list item contains nested lists
    const nestedLists = $(li).find('ol, ul');
    if (nestedLists.length) {
      // Recursively extract items from nested lists
      const nestedItems = extractListItems(li);
      items.push(...nestedItems);
    } else {
      items.push({
        component: 'text',
        value: textValue,
        decoration: isOrdered ? { type: 'number', value: index + 1 } : { type: 'bullet' },
      });
    }
  });
  return items;
}

// // TABLE STRUCTURE DATA
function createTableStructure(tableHTML) {
  const tableData = [];
  const $ = cheerio.load(tableHTML);
  const rows = $('tr').toArray(); // Convert to array

  rows.forEach((row, rowIndex) => {
    const rowData = [];
    const cells = $(row).find('th, td');

    cells.each((_, cell) => {
      rowData.push($(cell).text());
    });
    tableData.push(rowData);
  });

  const [headerData, ...itemsData] = tableData;

  const tableStructure = {
    component: 'table',
    value: headerData.map((header, index) => ({
      header: `<b>${header}</b>`,
      items: itemsData.map(rowData => rowData[index]),
    })),
  };
  return tableStructure
}

// YOUTUBE DATA
function extractYoutubeVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

module.exports = strapiToMerakiConverter;


// // Script for the WYSWYG(Editor Js) of Exercises

// const strapiToMerakiConverter = (blockData) => {
//   const translatedData = [];
//   for (const comp of blockData) {
//     switch (comp.type) {
//       case 'header':
//         translatedData.push({
//           component: 'header',
//           variant: comp.data.level,
//           value: comp.data.text,
//         });
//         break;

//       case 'paragraph':
//         translatedData.push({
//           component: 'text',
//           value: comp.data.text,
//         });
//         break;

//       case 'image':
//         translatedData.push({
//           component: 'image',
//           value: comp.data.file.url,
//           alt: comp.data.file.alt,
//         });
//         break;

//       case 'embed':
//         // for supported different type youtube URLs --> a= 'https://www.youtube.com/watch?v=iuk77TjvfmE', b='https://youtu.be/iuk77TjvfmE', c='https://youtu.be/XM6kTQPzzpQ?t=50'

//         translatedData.push({
//           component: 'youtube',
//           // eslint-disable-next-line no-nested-ternary
//           value: comp.data.source.includes('https://www.youtube.com')
//             ? comp.data.source.split('/watch?v=')[1].split('&t=')[0]
//             : comp.data.source.includes('?t=')
//               ? comp.data.source.split('youtu.be/')[1].split('?t=')[0]
//               : comp.data.source.split('youtu.be/')[1],
//         });
//         break;

//       case 'list':
//         const listItems = comp.data.items;
//         const decoration = comp.data.style === 'ordered' ? { type: 'number' } : { type: 'bullet' };
//         const items = listItems.map((value, index) => ({
//           component: 'text',
//           value,
//           decoration: {
//             ...decoration,
//             value: comp.data.style === 'ordered' ? index + 1 : undefined,
//           },
//         }));
//         translatedData.push(...items);
//         break;

//       case 'code':
//         const isJavaScript = /(?:\b(?:var|let|const|console)\b|=>|\{|\}|\/\/|\/\*)/g.test(comp.data.code);

//         translatedData.push({
//           component: 'code',
//           type: isJavaScript ? 'javascript' : 'python',
//           title: '',
//           value: comp.data.code.replace(/ {2,4,8,12,16,20}/g, (match) => '\t'.repeat(match.length / 4)).replace(/\n/g, '<br>'),
//         });
//         break;


//       case 'table':
//         const { content } = comp.data;
//         const headers = content[0];
//         const rows = content.slice(1);
//         const value = headers.map((header, index) => ({
//           header: `<b>${header}</b>`,
//           items: rows.map((row) => row[index]),
//         }));
//         translatedData.push({
//           component: 'table',
//           value,
//         });
//         break;

//       default:
//       // ignore unknown types
//     }
//   }
//   // console.log(translatedData);
//   return translatedData;
// };

// module.exports = strapiToMerakiConverter;
