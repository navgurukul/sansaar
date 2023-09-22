/* eslint-disable no-else-return */
/* eslint-disable prettier/prettier */
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
      value: codeBlock.data.code
        .replace(/ {4}/g, '&emsp;')          // Replace 4 spaces with 1 &emsp; entity
        .replace(/ {8}/g, '&emsp;&emsp;')    // Replace 8 spaces with 2 &emsp; entities
        .replace(/ {12}/g, '&emsp;&emsp;&emsp;')  // Replace 12 spaces with 3 &emsp; entities
        .replace(/ {16}/g, '&emsp;&emsp;&emsp;&emsp;')  // Replace 16 spaces with 4 &emsp; entities
        .replace(/\n/g, '<br>'),
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

let correct = {};

function options(dynamic) {
  const correctValues = [];
  dynamic.forEach((opt) => {
    if (opt.correct === true) {
      correctValues.push({ "value": opt.number }); // Push correct value with "value" property
    } else {
      correctValues.push({ "value": 1 }); // Push empty string with "value" property
    }
  });
  if (correctValues.length > 0) {
    correct =  correctValues[0].value;
    ; 
  } else {
    correct =  1 ; // In case of true is not selected in content
  }
  const mappedOptions = dynamic.map((option) => {
    const optionValue = JSON.parse(option.value);
    if (optionValue.blocks[0].type === 'image') {
      const imageUrl = optionValue.blocks[0].data.file.url;
      return {
        id: option.number,
        type: 'image',
        value: `${String.fromCharCode(96 + option.number)}) ${imageUrl}`,
      };
    } else if (optionValue.blocks[0].type === 'paragraph') {
      const text = optionValue.blocks[0].data.text.trim();
      return {
        id: option.number,
        type: 'text',
        value: `${String.fromCharCode(96 + option.number)}) ${text}`,
      };
    } else {
      // when the option has both the text and image at the same time
      const text = optionValue.blocks[0].data.text.trim();
      const imageUrl = optionValue.blocks[1].data.file.url;
      return {
        id: option.number,
        type: 'both',
        value: `${String.fromCharCode(96 + option.number)}) ${text} ${imageUrl}`,
      };
    }
  });
  return {
    // correct,
    value: mappedOptions,
    component: 'options',
  };
}

function explaination(explanation) {
  // const data = JSON.parse(explanation.correct);
  const correctHeaderBlock = [
    {
      value: '🥳 <span style="color: #48a145;">You got it right</span>',
      variant: 3,
      component: 'header',
    },
    {
      value: "Let's see why",
      variant: 3,
      component: "header"
    }
  ]
  const correctData = [];

  JSON.parse(explanation.correct).blocks.forEach((block) => {
    if (block.type === 'paragraph') {
      correctData.push({
        value: block.data.text,
        component: block.type === 'paragraph' ? 'text' : 'header',
      });
    }
  });
  correctHeaderBlock.push(correctData[0]);

  const InCorrectHeaderBlock = [
    {
      value: '😟 <span style="color: red;">It missed the mark</span>',
      variant: 3,
      component: 'header',
    },
    {
      value: "Let's see why",
      variant: 3,
      component: "header"
    }
  ]
  const incorrectData = [];

  JSON.parse(explanation.incorrect).blocks.forEach((block) => {
    if (block.type === 'paragraph') {
      incorrectData.push({
        value: block.data.text,
        component: block.type === 'paragraph' ? 'text' : 'header',
      });
    }
  });

  // Inserting the new element at index 2
  InCorrectHeaderBlock.splice(2, 0, incorrectData[0]);

  return {
    value: { correct: correctHeaderBlock, incorrect: InCorrectHeaderBlock },
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
    { value: correct, component: 'solution' },
    explanationData,
  ];
  // return JSON.stringify(finalData);
  return JSON.stringify(finalData, null, 2);
};

module.exports = assessmentConverter;
