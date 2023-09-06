/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-case-declarations */
const strapiToMerakiConverter = (blockData) => {
  const translatedData = [];
  for (const comp of blockData) {
    switch (comp.type) {
      case 'header':
        translatedData.push({
          component: 'header',
          variant: comp.data.level,
          value: comp.data.text,
        });
        break;

      case 'paragraph':
        translatedData.push({
          component: 'text',
          value: comp.data.text,
        });
        break;

      case 'image':
        translatedData.push({
          component: 'image',
          value: comp.data.file.url,
          alt: comp.data.file.alt,
        });
        break;

      case 'embed':
        // for supported different type youtube URLs --> a= 'https://www.youtube.com/watch?v=iuk77TjvfmE', b='https://youtu.be/iuk77TjvfmE', c='https://youtu.be/XM6kTQPzzpQ?t=50'

        translatedData.push({
          component: 'youtube',
          // eslint-disable-next-line no-nested-ternary
          value: comp.data.source.includes('https://www.youtube.com')
            ? comp.data.source.split('/watch?v=')[1].split('&t=')[0]
            : comp.data.source.includes('?t=')
              ? comp.data.source.split('youtu.be/')[1].split('?t=')[0]
              : comp.data.source.split('youtu.be/')[1],
        });
        break;

      case 'list':
        const listItems = comp.data.items;
        const decoration = comp.data.style === 'ordered' ? { type: 'number' } : { type: 'bullet' };
        const items = listItems.map((value, index) => ({
          component: 'text',
          value,
          decoration: {
            ...decoration,
            value: comp.data.style === 'ordered' ? index + 1 : undefined,
          },
        }));
        translatedData.push(...items);
        break;

      case 'code':
        const isJavaScript = /(?:\b(?:var|let|const|console)\b|=>|\{|\}|\/\/|\/\*)/g.test(comp.data.code);

        translatedData.push({
          component: 'code',
          type: isJavaScript ? 'javascript' : 'python',
          title: '',
          value: comp.data.code.replace(/ {2,4,8,12,16,20}/g, (match) => '\t'.repeat(match.length / 4)).replace(/\n/g, '<br>'),
        });
        break;


      case 'table':
        const { content } = comp.data;
        const headers = content[0];
        const rows = content.slice(1);
        const value = headers.map((header, index) => ({
          header: `<b>${header}</b>`,
          items: rows.map((row) => row[index]),
        }));
        translatedData.push({
          component: 'table',
          value,
        });
        break;

      default:
      // ignore unknown types
    }
  }
  // console.log(translatedData);
  return translatedData;
};

module.exports = strapiToMerakiConverter;
