// /* eslint-disable prettier/prettier */
// /* eslint-disable no-restricted-syntax */
// /* eslint-disable no-case-declarations */
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
const cheerio = require('cheerio');

const htmlToMerakiConverter = (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const translatedData = [];

  $('h2, h4, p, ol, ul, li, img, div[data-youtube-video], iframe, table').each((index, element) => {
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
        translatedData.push({
          component: 'text',
          value: elementText,
        });
        break;

      case 'ol':
        const olItems = $(element).find('li');
        olItems.each((index, li) => {
          translatedData.push({
            component: 'text',
            value: $(li).text(),
            decoration: {
              type: 'number',
              value: index + 1,
            },
          });
        });
        break;

      case 'ul':
        const ulItems = $(element).find('li');
        ulItems.each((index, li) => {
          translatedData.push({
            component: 'text',
            value: $(li).text(),
            decoration: {
              type: 'bullet',
            },
          });
        });
        break;

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
          translatedData.push({
            component: 'youtube',
            value: iframeSrc,
          });
        }
        break;

      case 'table':
        const tableDatas = createTableStructure(element);
        translatedData.push(tableDatas);
        break;


      default:
      // Ignore unknown types
    }
  });

  return translatedData;
};

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



module.exports = htmlToMerakiConverter;

