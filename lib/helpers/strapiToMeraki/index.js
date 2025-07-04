const parse5 = require('parse5');

// Set to track nodes that have already been processed as part of tables or other components
const processedNodes = new WeakSet();

// Helper function to mark a node and all its descendants as processed
function markNodeAsProcessed(node) {
  if (!node) return;
  processedNodes.add(node);
  
  if (node.childNodes) {
    node.childNodes.forEach(childNode => markNodeAsProcessed(childNode));
  }
}

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

  // Helper function to process headers
  function processHeader(node, translatedData) {
    translatedData.push(...parseHeaders(node));
  }

  // Helper function to process paragraphs
  function processParagraph(node, translatedData) {
    translatedData.push({
      component: 'text',
      value: getTextContent(node),
    });
  }

  // Helper function to process lists
  function processList(node, translatedData) {
    translatedData.push(...extractListItems(node));
  }

  // Helper function to process images
  function processImage(node, translatedData) {
    // Skip if this image is already processed as part of a table or side-by-side
    if (processedNodes.has(node)) return;
    
    const imageUrl = getAttribute(node, 'src');
    if (imageUrl) {
      translatedData.push({
        component: 'image',
        value: imageUrl,
        alt: getAttribute(node, 'alt') || '', 
      });
      
      // Mark this image as processed
      markNodeAsProcessed(node);
    }
  }

  // Helper function to process iframes
  function processIframe(node, translatedData) {
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
  }

  // Helper function to process code blocks
  function processCodeBlock(node, translatedData) {
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
  }

  const traverse = (node) => {
    // Skip already processed nodes
    if (processedNodes.has(node)) return;
    
    // Check for side-by-side content first
    const sideBySideComponents = detectSideBySideContent(node);
    if (sideBySideComponents) {
      translatedData.push(...sideBySideComponents);
      
      // Mark this node and all its children as processed to avoid duplicate extraction
      markNodeAsProcessed(node);
    } else {
      // Process based on node type
      switch (node.nodeName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
          processHeader(node, translatedData);
          break;
        case 'p':
          processParagraph(node, translatedData);
          break;
        case 'ol':
        case 'ul':
          processList(node, translatedData);
          break;
        case 'img':
          // Only process if not already processed as part of a table or side-by-side
          processImage(node, translatedData);
          break;
        case 'iframe':
          processIframe(node, translatedData);
          break;
        case 'pre':
          processCodeBlock(node, translatedData);
          break;
        case 'table': {
          const tableData = createTableStructure(node);
          translatedData.push(tableData);
          // Mark the table node and all its children as processed
          markNodeAsProcessed(node);
          break;
        }
      }

      // Continue traversing child nodes if not already marked as processed
      if (node.childNodes) {
        node.childNodes.forEach(traverse);
      }
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
    return ` <b>${getTextContentFromChildren(node)}</b> `;
  } else if (node.nodeName === 'em') {
    return ` <i>${getTextContentFromChildren(node)}</i > `;
  } else if (node.nodeName === 'a') {
    const href = getAttribute(node, 'href');
    const textContent = getTextContentFromChildren(node);
    if (href === textContent) {
      return `<a href="${href}">${href}</a>`;
    }
    return `<a href="${href}">${getTextContentFromChildren(node)}</a>`;
  }
  else if (node.childNodes) {
    return node.childNodes.map(childNode => getTextContent(childNode)).join('');
  }
  return '';
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
  const listItems = [];
  const isOrdered = node.nodeName === 'ol';
  let startNumber = 1; // Default starting number for ordered lists
  
  // Check for explicit start attribute in ordered lists
  if (isOrdered) {
    const startAttr = getAttribute(node, 'start');
    if (startAttr && !isNaN(parseInt(startAttr))) {
      startNumber = parseInt(startAttr);
    }
  }
  
  // Process each list item
  node.childNodes.forEach(childNode => {
    if (childNode.nodeName === 'li') {
      const textValue = getTextContent(childNode);
      
      // Add the item text without modification - the ordered/unordered formatting
      // will be handled by the client based on the list type
      listItems.push(textValue);
    }
  });
  
  if (listItems.length > 0) {
    const listComponent = {
      component: 'list',
      type: isOrdered ? 'ordered' : 'unordered',
      value: listItems
    };
    
    // For ordered lists, include the start number if not 1
    // This allows the client to render the list starting from the correct number
    if (isOrdered && startNumber !== 1) {
      listComponent.start = startNumber;
    }
    
    items.push(listComponent);
  }
  
  return items;
}

// Helper function to create table structure
function createTableStructure(node) {
  const tableData = [];
  
  // Function to process a cell node and extract all content including text and images
  const processCellNode = (cellNode) => {
    // Check if cell has images
    const imageUrl = findImage(cellNode);
    const cellText = getTextContent(cellNode).trim();
    const isHeaderCell = cellNode.nodeName === 'th';
    
    // Return cell content with both text and image info if available
    return {
      text: cellText,
      imageUrl: imageUrl,
      isHeaderCell
    };
  };

  // Process thead section if exists
  node.childNodes.forEach(childNode => {
    if (childNode.nodeName === 'thead') {
      // Process thead content
      // Process thead rows
      childNode.childNodes.forEach(rowNode => {
        if (rowNode.nodeName === 'tr') {
          const rowData = [];
          rowNode.childNodes.forEach(cellNode => {
            if (cellNode.nodeName === 'td' || cellNode.nodeName === 'th') {
              rowData.push(processCellNode(cellNode));
            }
          });
          if (rowData.length > 0) {
            tableData.push(rowData);
          }
        }
      });
    }
  });

  // Process tbody section or direct tr children
  const directRows = [];
  node.childNodes.forEach(childNode => {
    // Handle both tbody > tr structure and direct tr children
    if (childNode.nodeName === 'tbody' || childNode.nodeName === 'tr') {
      const rows = childNode.nodeName === 'tbody' 
        ? childNode.childNodes.filter(row => row.nodeName === 'tr')
        : [childNode];
      
      rows.forEach(rowNode => {
        if (rowNode.nodeName === 'tr') {
          const rowData = [];
          rowNode.childNodes.forEach(cellNode => {
            if (cellNode.nodeName === 'td' || cellNode.nodeName === 'th') {
              rowData.push(processCellNode(cellNode));
            }
          });
          if (rowData.length > 0) {
            directRows.push(rowData);
          }
        }
      });
    }
  });
  
  // Add tbody rows to tableData if not empty
  if (directRows.length > 0) {
    tableData.push(...directRows);
  }

  // Ensure there is at least one row
  if (tableData.length === 0) {
    return {
      component: 'table',
      value: []
    };
  }

  // Determine header row based on explicit headers or first row
  const [headerRow, ...itemsRows] = tableData;
  
  // Mark the table node and all its content as processed to prevent duplicate extraction
  markNodeAsProcessed(node);
  
  // Map headers and items considering both text and image content
  const tableStructure = {
    component: 'table',
    value: headerRow.map((header, index) => {
      let headerValue;
      
      // For headers with images, include both the image and text
      if (header.imageUrl) {
        // Add bold formatting if this is a real header cell (th) or we're using first row as header
        headerValue = `<b>${header.text || ''}</b>`;
        return {
          header: headerValue,
          headerImage: header.imageUrl,
          items: itemsRows.map(rowData => {
            const cell = rowData[index];
            if (!cell) return '';
            
            // For cells with images, return an object with both text and image
            if (cell.imageUrl) {
              return {
                text: cell.text || '',
                imageUrl: cell.imageUrl
              };
            } else {
              return cell.text;
            }
          })
        };
      } else {
        // For text-only headers
        headerValue = `<b>${header.text || ''}</b>`;
        return {
          header: headerValue,
          items: itemsRows.map(rowData => {
            const cell = rowData[index];
            if (!cell) return '';
            
            // For cells with images, return an object with both text and image
            if (cell.imageUrl) {
              return {
                text: cell.text || '',
                imageUrl: cell.imageUrl
              };
            } else {
              return cell.text;
            }
          })
        };
      }
    })
  };
  
  return tableStructure;
}

// Helper function to extract YouTube video ID - simplified regex
function extractYoutubeVideoId(url) {
  // Simplified regular expression pattern
  const regExp = /(?:youtube\.com\/(?:.*v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match?.[1] ?? null; // Using optional chaining and nullish coalescing
}

// Helper function to check if a node contains an image and extract its URL
function findImage(node) {
  if (node.nodeName === 'img') {
    return getAttribute(node, 'src');
  }
  
  if (node.childNodes) {
    for (const child of node.childNodes) {
      const imgSrc = findImage(child);
      if (imgSrc) {
        return imgSrc;
      }
    }
  }
  return null;
}

// Helper function to create a side-by-side component from two cells
function createSideBySideComponent(leftCell, rightCell) {
  const component = {
    component: 'sideBySide',
    left: {},
    right: {}
  };
  
  // Process left cell
  const leftImageUrl = findImage(leftCell);
  const leftText = getTextContent(leftCell).trim();
  
  if (leftImageUrl) {
    component.left = {
      type: 'image',
      value: leftImageUrl,
      text: leftText
    };
  } else {
    component.left = {
      type: 'text',
      value: leftText
    };
  }
  
  // Process right cell
  const rightImageUrl = findImage(rightCell);
  const rightText = getTextContent(rightCell).trim();
  
  if (rightImageUrl) {
    component.right = {
      type: 'image',
      value: rightImageUrl,
      text: rightText
    };
  } else {
    component.right = {
      type: 'text',
      value: rightText
    };
  }
  
  return component;
}

// Helper function to analyze table structure
function analyzeTableStructure(tableNode) {
  let rowCount = 0;
  let maxColumns = 0;
  let hasStructuredHeaders = false;
  let hasImage = false;
  let hasThCell = false;
  
  // Check if there's any 'th' element in the table to indicate explicit headers
  const checkForThElements = (node) => {
    if (node.nodeName === 'th') {
      hasThCell = true;
      return true;
    }
    
    if (node.childNodes) {
      for (const child of node.childNodes) {
        if (checkForThElements(child)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Check for explicit header elements
  checkForThElements(tableNode);
  
  // Check for thead/tbody structure and count rows/columns
  let bodyRows = [];
  tableNode.childNodes.forEach(child => {
    if (child.nodeName === 'thead') {
      hasStructuredHeaders = true;
    }
    
    if (child.nodeName === 'tbody' || child.nodeName === 'tr') {
      // Handle both direct tr children and tbody > tr structure
      const rows = child.nodeName === 'tbody' 
        ? child.childNodes.filter(row => row.nodeName === 'tr')
        : [child];
      
      bodyRows = bodyRows.concat(rows);
      
      rows.forEach(rowNode => {
        const cells = rowNode.childNodes.filter(cell => 
          cell.nodeName === 'td' || cell.nodeName === 'th');
        
        maxColumns = Math.max(maxColumns, cells.length);
        
        // Check for images in cells
        cells.forEach(cellNode => {
          if (findImage(cellNode)) {
            hasImage = true;
          }
        });
      });
    }
  });
  
  rowCount = bodyRows.length;
  
  return { 
    rowCount, 
    maxColumns, 
    hasStructuredHeaders, 
    hasImage,
    hasExplicitHeader: hasStructuredHeaders || hasThCell
  };
}

// Extract side-by-side components from table rows
function extractSideBySideFromRows(tableNode) {
  const sideBySideComponents = [];
  
  // Process both direct tr children and tbody > tr structure
  const processRowNode = (rowNode) => {
    if (rowNode.nodeName === 'tr') {
      const cells = rowNode.childNodes.filter(cell => 
        cell.nodeName === 'td' || cell.nodeName === 'th');
      
      // Only process if we have exactly 2 cells for side-by-side
      if (cells.length === 2) {
        const component = createSideBySideComponent(cells[0], cells[1]);
        sideBySideComponents.push(component);
      }
    }
  };
  
  // Handle both direct tr children and rows inside tbody
  tableNode.childNodes.forEach(child => {
    if (child.nodeName === 'tbody') {
      // Handle tbody > tr structure
      child.childNodes.forEach(processRowNode);
    } else if (child.nodeName === 'tr') {
      // Handle direct tr children
      processRowNode(child);
    }
  });
  
  return sideBySideComponents.length > 0 ? sideBySideComponents : null;
}

// Helper function to check if a node can potentially be converted to side-by-side layout
function canNodeContainSideBySide(node) {
  return (node.nodeName === 'figure' || node.nodeName === 'div') && node.childNodes;
}

// Helper function to get a table node from a container, if it exists
function findTableNode(containerNode) {
  return containerNode.childNodes.find(child => child.nodeName === 'table');
}

// Helper function to check if a table should be skipped based on its class
function shouldSkipTable(tableNode) {
  const tableClass = tableNode.attrs?.find(attr => attr.name === 'class')?.value || '';
  return tableClass.includes('data-table') || tableClass.includes('info-table');
}

// Helper function to detect and extract side-by-side content
function detectSideBySideContent(node) {
  // Check if this can potentially contain a side-by-side layout
  if (!canNodeContainSideBySide(node)) {
    return null;
  }
  
  // Find table node
  const tableNode = findTableNode(node);
  if (!tableNode) return null;
  
  // Check if table should be skipped based on class
  if (shouldSkipTable(tableNode)) {
    return null;
  }
  
  // Analyze table structure
  const { maxColumns, hasExplicitHeader } = analyzeTableStructure(tableNode);
  
  // Keep tables with explicit headers as tables
  if (hasExplicitHeader) {
    return null;
  }
  
  // Convert tables with 2 columns and no explicit header to side-by-side
  if (maxColumns === 2) {
    // Mark the table and its contents as processed to prevent duplicate extraction
    if (typeof markNodeAsProcessed === 'function') {
      markNodeAsProcessed(tableNode);
    }
    
    return extractSideBySideFromRows(tableNode);
  }
  
  // Keep all other tables as tables
  return null;
}

module.exports = strapiToMerakiConverter;
