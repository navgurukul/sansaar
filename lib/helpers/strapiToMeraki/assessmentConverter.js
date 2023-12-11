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
    }
  });
  if (correctValues.length > 0) {
    correct = correctValues[0].value;
    ;
  } else {
    correct = 1; // In case of true is not selected in content
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


function questionCodeV2(question) {
  const data = JSON.parse(question);
  const expressionBlock = data.blocks.find((block) => block.type === 'paragraph');
  const codeBlock = data.blocks.find((block) => block.type === 'code');
  const image = data.blocks.find((block) => block.type === 'image');


  const questionDataV2 = [
    {
      type: 'python',
      title: '',
      value: expressionBlock.data.text,
      component: 'questionExpression',
    },
  ];


  if (codeBlock) {
    questionDataV2.push({
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
    questionDataV2.push({
      alt: image.data.caption ? image.data.caption : '',
      value: image.data.file.url,
      component: 'image',
    });
  }
  return questionDataV2;
}
// for multiple correct options
let correctV2 = {};
let incorrectV2 = {};
let optionType;
function optionsV2(dynamic) {
  const correctValues = [];
  const incorrectValues = [];
  dynamic.forEach((opt) => {
    if (opt.correct === true) {
      correctValues.push({ "value": opt.number }); // Push correct value with "value" property
    }
    else {
      incorrectValues.push({ "value": opt.number }); // Push incorrect value with "value" property
    }
  });
  if (correctValues.length > 0) {
    correctV2 = correctValues;
  } else {
    correctV2 = [{ "value": 1 }]; // In case of true is not selected in content
  }
  incorrectV2 = incorrectValues;
  if (correctValues.length > 1) {
    optionType = 'multiple';
  } else {
    optionType = 'single';
  }
  const mappedOptionsV2 = dynamic.map((option) => {
    const optionValue = JSON.parse(option.value);
    if (optionValue.blocks[0].type === 'image') {
      const imageUrl = optionValue.blocks[0].data.file.url;
      return {
        id: option.number,
        option_type: 'image',
        value: `${imageUrl}`,
      };
    } else if (optionValue.blocks[0].type === 'paragraph') {
      const text = optionValue.blocks[0].data.text.trim();
      return {
        id: option.number,
        option_type: 'text',
        value: `${text}`,
      };
    } else {
      // when the option has both the text and image at the same time
      const text = optionValue.blocks[0].data.text.trim();
      const imageUrl = optionValue.blocks[1].data.file.url;
      return {
        id: option.number,
        option_type: 'both',
        value: `${text} ${imageUrl}`,
      };
    }
  });
  return {
    // correct,
    value: mappedOptionsV2,
    component: 'options',
  };
}

function explainationV2(explanation) {
  // const data = JSON.parse(explanation.correct);
  const correctHeaderBlock = [
    {
      value: `🥳 <span style="color: #48a145;">That's right. Well done!</span>`,
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
      value: `😟 <span style="color: red;">That's off the mark. Correct answer are waiting to be discovered</span>`,
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

  const partiallyCorrectHeaderBlock = [
    {
      value: `😯 <span style="color: red;">Quite close! However, some correct answer(s) were missed</span>`,
      variant: 3,
      component: 'header',
    },
    {
      value: "Let's see why",
      variant: 3,
      component: "header"
    }
  ]
  const partiallyCorrectData = [];

  JSON.parse(explanation.incorrect).blocks.forEach((block) => {
    if (block.type === 'paragraph') {
      partiallyCorrectData.push({
        value: block.data.text,
        component: block.type === 'paragraph' ? 'text' : 'header',
      });
    }
  });
  partiallyCorrectHeaderBlock.push(partiallyCorrectData[0]);

  const partiallyIncorrectHeaderBlock = [
    {
      value: `😯 <span style="color: red;">Quite close! However, both correct and incorrect answers were selected</span>`,
      variant: 3,
      component: 'header',
    },
    {
      value: "Let's see why",
      variant: 3,
      component: "header"
    }
  ]
  const partiallyIncorrectData = [];

  JSON.parse(explanation.incorrect).blocks.forEach((block) => {
    if (block.type === 'paragraph') {
      partiallyIncorrectData.push({
        value: block.data.text,
        component: block.type === 'paragraph' ? 'text' : 'header',
      });
    }
  });
  partiallyIncorrectHeaderBlock.push(partiallyIncorrectData[0]);

  return {
    value: { correct: correctHeaderBlock, incorrect: InCorrectHeaderBlock, partially_correct: partiallyCorrectHeaderBlock, partially_incorrect: partiallyIncorrectHeaderBlock },
    component: 'output',
  };
}

//  to convert assessments strapi format to desired meraki format
const assessmentConverterV2 = (attributes) => {
  const questionDataV2 = questionCodeV2(attributes.question);
  const optionsDataV2 = optionsV2(attributes.dynamic);
  optionsDataV2.assessment_type = optionType;
  const explanationDataV2 = explainationV2(attributes.explaination);
  const finalDataV2 = [
    ...questionDataV2,
    optionsDataV2,
    { type: optionType, correct_options_value: correctV2, incorrect_options_value: incorrectV2, component: 'solution' },
    explanationDataV2,
  ];
  // return JSON.stringify(finalData);
  return JSON.stringify(finalDataV2, null, 2);
};
module.exports = { assessmentConverter, assessmentConverterV2 };
