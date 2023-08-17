/* eslint-disable default-case */
/* eslint-disable no-restricted-syntax */
function questionCode(question) {
  const data = JSON.parse(question);
  const expressionBlock = data.blocks.find((block) => block.type === 'paragraph');
  const codeBlock = data.blocks.find((block) => block.type === 'code');
  const image = data.blocks.find((block) => block.type === 'image');

  const questionData = [
    {
      type: 'python',
      title: '',
      value: expressionBlock.data.text,
      component: 'questionExpression',
    },
  ];

  if (codeBlock) {
    questionData.push({
      type: 'python',
      title: '',
      value: codeBlock.data.code,
      component: 'questionCode',
    });
  }
  if (image) {
    questionData.push({
      alt: image.data.caption ? image.data.caption : '',
      value: image.data.file.url,
      component: 'image',
    });
  }
  return questionData;
}

function options(dynamic) {
  return {
    value: dynamic.map((option) => ({
      id: `${String.fromCharCode(96 + option.number)}) `,
      value: JSON.parse(option.value).blocks[0].data.text.trim(),
    })),
    component: 'options',
  };
}

function explaination(explanation) {
  const data = JSON.parse(explanation.correct);
  const correctData = data.blocks.map((block) => ({
    value: block.data.text,
    component: block.type === 'paragraph' ? 'text' : null,
  }));
  const incorrectData = JSON.parse(explanation.incorrect).blocks.map((block) => ({
    value: block.data.text,
    component: block.type === 'paragraph' ? 'text' : null,
  }));

  return {
    value: { correct: correctData, incorrect: incorrectData },
    component: 'output',
  };
}

//  to convert assessments strapi format to desired meraki format
const assessmentConverter = (attributes) => {
  const questionData = questionCode(attributes.question);
  const optionsData = options(attributes.dynamic);
  const explanationData = explaination(attributes.explaination);
  const finalData = [
    ...questionData,
    optionsData,
    { value: 2, component: 'solution' },
    explanationData,
  ];
  // return JSON.stringify(finalData);
  return JSON.stringify(finalData, null, 2);
};

module.exports = assessmentConverter;
