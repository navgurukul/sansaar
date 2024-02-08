const parse5 = require('parse5');

const strapiToMerakiConverter = (htmlContent) => {
  const translatedData = [];
  const document = parse5.parse(htmlContent);

  const parseHeaders = (node) => {
    const headers = [];
    const traverse = (currentNode) => {
      if (currentNode.nodeName.startsWith('h') && currentNode.childNodes) {
        const headerText = getTextContent(currentNode);
        headers.push({
          component: 'header',
          variant: parseInt(currentNode.nodeName.slice(1)),
          value: headerText
        });
      } else if (currentNode.childNodes) {
        currentNode.childNodes.forEach(childNode => traverse(childNode));
      }
    };

    traverse(node);
    return headers;
  };

  const traverse = (node) => {
    if (node.nodeName === 'h1' || node.nodeName === 'h2' || node.nodeName === 'h3' || node.nodeName === 'h4') {
      translatedData.push(...parseHeaders(node));
    } else if (node.nodeName === 'p') {
      translatedData.push({
        component: 'text',
        value: getTextContent(node),
      });
    } else if (node.nodeName === 'ol' || node.nodeName === 'ul') {
      translatedData.push(...extractListItems(node));
    } else if (node.nodeName === 'img') {
      const imageUrl = getAttribute(node, 'src');
      if (imageUrl) {
        translatedData.push({
          component: 'image',
          value: imageUrl,
          alt: '', // You can modify this based on alt text availability
        });
      }
    } else if (node.nodeName === 'iframe') {
      const iframeSrc = getAttribute(node, 'src');
      if (iframeSrc) {
        const videoId = extractYoutubeVideoId(iframeSrc);
        if (videoId) {
          translatedData.push({
            component: 'youtube',
            value: videoId,
          });
        }
      }
    } else if (node.nodeName === 'pre') {
      const codeContent = getTextContent(node);
      const isJavaScript = /(?:\b(?:var|let|const|console)\b|=>|\{|\}|\/\/|\/\*)/g.test(codeContent);

      if (codeContent) {
        translatedData.push({
          component: 'code',
          type: isJavaScript ? 'javascript' : 'python',
          title: '',
          value: codeContent.replace(/ {2,4,8,12,16,20}/g, (match) => '\t'.repeat(match.length / 4)).replace(/\n/g, '<br>'),
        });
      }
    } else if (node.nodeName === 'table') {
      const tableData = createTableStructure(node);
      translatedData.push(tableData);
    }

    if (node.childNodes) {
      node.childNodes.forEach(traverse);
    }
  };

  traverse(document);

  return translatedData;
};

// Helper function to get the text content of a node
function getTextContent(node) {
  if (node.nodeName === '#text') {
    return node.value.trim();
  } else if (node.nodeName === 'strong') {
    return `<b>${getTextContentFromChildren(node)}</b>`;
  } else if (node.nodeName === 'em') {
    return `<i>${getTextContentFromChildren(node)}</i>`;
  } else if (node.childNodes) {
    return node.childNodes.map(childNode => getTextContent(childNode)).join('');
  }
  return;
}

// Helper function to get text content from children nodes
function getTextContentFromChildren(node) {
  return node.childNodes.map(childNode => getTextContent(childNode)).join('');
}

// Helper function to get attribute value of a node
function getAttribute(node, attributeName) {
  const attribute = node.attrs.find(attr => attr.name === attributeName);
  return attribute ? attribute.value : null;
}

// Helper function to extract list items
function extractListItems(node) {
  const items = [];
  node.childNodes.forEach(childNode => {
    if (childNode.nodeName === 'li') {
      const textValue = getTextContent(childNode);
      items.push({
        component: 'text',
        value: textValue,
      });
    }
  });
  return items;
}

// Helper function to create table structure
function createTableStructure(node) {
  const tableData = [];
  node.childNodes.forEach(childNode => {
    if (childNode.nodeName === 'tbody') {
      childNode.childNodes.forEach(rowNode => {
        if (rowNode.nodeName === 'tr') {
          const rowData = [];
          rowNode.childNodes.forEach(cellNode => {
            if (cellNode.nodeName === 'td' || cellNode.nodeName === 'th') {
              rowData.push(getTextContent(cellNode));
            }
          });
          tableData.push(rowData);
        }
      });
    }
  });

  const [headerData, ...itemsData] = tableData;

  const tableStructure = {
    component: 'table',
    value: headerData.map((header, index) => ({
      header: `<b>${header}</b>`,
      items: itemsData.map(rowData => rowData[index]),
    })),
  };
  return tableStructure;
}

// Helper function to extract YouTube video ID
function extractYoutubeVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

module.exports = strapiToMerakiConverter;
