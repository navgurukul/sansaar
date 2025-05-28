/* eslint-disable no-else-return */
/* eslint-disable prettier/prettier */
/* eslint-disable default-case */
/* eslint-disable no-restricted-syntax */
const cheerio = require('cheerio');

function questionCode(question) {
  const data = question;
  const $ = cheerio.load(data);
  const codeElement = $('pre code');
  const image = $('img').attr('src');
  const expressionBlock = $('p').text().trim();
  const codeBlock = codeElement.length ? codeElement.text() : '';

  const questionData = [
    {
      type: 'python',
      title: '',
      value: expressionBlock,
      component: 'questionExpression',
    },
  ];


  if (codeBlock) {
    questionData.push({
      type: 'python',
      title: '',
      value: codeBlock
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
      alt: 'picture.png',
      value: image,
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
    const optionValue = option.value;
    const firstBlock = optionValue[0].children && optionValue[0].children[0];
    if (optionValue[0].type === 'image') {
      const imageUrl = optionValue[0].image && optionValue[0].image.url;
      if (!imageUrl) {
        return null; // or handle the error
      }
      return {
        id: option.number,
        type: 'image',
        value: `${String.fromCharCode(96 + option.number)}) ${imageUrl}`,
      };
    } else if (optionValue[0].type === 'paragraph') {
      const text = firstBlock.text.trim();
      return {
        id: option.number,
        type: 'text',
        value: `${String.fromCharCode(96 + option.number)}) ${text}`,
      };
    } else {
      const text = optionValue[0].children[0].text.trim();
      const imageUrl = optionValue[0].children[1].image && optionValue[0].children[1].image.url;
      if (!imageUrl) {
        return null; // or handle the error
      }
      return {
        id: option.number,
        type: 'both',
        value: `${String.fromCharCode(96 + option.number)}) ${text} ${imageUrl}`,
      };
    }
  }).filter(Boolean); // Remove any null values from the result
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
  correctData.push({
    value: explanation,
    component: 'text',
  })
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
  incorrectData.push({
    value: explanation,
    component: 'text',
  })

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
  const optionsData = options(attributes.option);
  optionsData.assessment_type = 'single';
  const explanationData = explaination(attributes.explaination);
  const finalData = [
    ...questionData,
    optionsData,
    { type: optionType, correct_options_value: correct, incorrect_options_value: 1, component: 'solution' },
    explanationData,
  ];
  // return JSON.stringify(finalData);
  return JSON.stringify(finalData, null, 2);
};


function questionCodeV2(question) {
  const data = question;
  const $ = cheerio.load(data);
  const codeElement = $('pre code');
  const image = $('img').attr('src');
  const expressionBlock = $('p').text().trim();
  const codeBlock = codeElement.length ? codeElement.text() : '';

  const questionDataV2 = [
    {
      type: 'python',
      title: '',
      value: expressionBlock,
      component: 'questionExpression',
    },
  ];


  if (codeBlock) {
    questionDataV2.push({
      type: 'python',
      title: '',
      value: codeBlock
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
      alt: 'picture.png',
      value: image,
      component: 'image',
    });
  }
  return questionDataV2;
}
// for multiple correct options
let correctV2 = {};
let incorrectV2 = {};
let optionType;
function optionsV2(option) {
  const correctValues = [];
  const incorrectValues = [];
  option.forEach((opt) => {
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

  const mappedOptionsV2 = option.map((opt) => {
    const optionValue = opt.value;
    
    if (optionValue && optionValue[0]) {
      const optionType = optionValue[0].type;

      if (optionType === 'image') {
        const imageUrl = optionValue[0].image && optionValue[0].image.url;
        return {
          id: opt.number,
          option_type: 'image',
          value: imageUrl || '', // Handle undefined imageUrl
        };
      } else if (optionType === 'paragraph') {
        const text = optionValue[0].children;
        return {
          id: opt.number,
          option_type: 'text',
          value: text && text[0] ? text[0].text : '', // Handle undefined text
        };
      } else {
        // when the option has both the text and image at the same time
        const text = optionValue[0].data && optionValue[0].data.text.trim();
        const imageUrl =
          optionValue[0].blocks && optionValue[0].blocks[1].data.file.url;

        return {
          id: opt.number, // Fix variable name here
          option_type: 'both',
          value: `${text || ''} ${imageUrl || ''}`, // Handle undefined text and imageUrl
        };
      }
    } else {
      // Handle the case when optionValue is undefined or optionValue[0] is undefined
      return {
        id: opt.number,
        option_type: 'unknown',
        value: '',
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
  const explainationText = [];
  explainationText.push({
    value: explanation,
    component: 'text',
  })
  correctHeaderBlock.push(explainationText[0]);

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
  InCorrectHeaderBlock.push(explainationText[0]);

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

  partiallyCorrectHeaderBlock.push(explainationText[0]);

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
  partiallyIncorrectHeaderBlock.push(explainationText[0]);

  return {
    value: { correct: correctHeaderBlock, incorrect: InCorrectHeaderBlock, partially_correct: partiallyCorrectHeaderBlock, partially_incorrect: partiallyIncorrectHeaderBlock },
    component: 'output',
  };
}

//  to convert assessments strapi format to desired meraki format
const assessmentConverterV2 = (attributes) => {
  const questionDataV2 = questionCodeV2(attributes.question);
  const optionsDataV2 = optionsV2(attributes.option);
  optionsDataV2.assessment_type = optionType;
  const explanationDataV2 = explainationV2(attributes.explaination);
  const finalDataV2 = [
    ...questionDataV2,
    optionsDataV2,
    { type: optionType, correct_options_value: correctV2, incorrect_options_value: incorrectV2, component: 'solution' },
    explanationDataV2,
  ];
  return finalDataV2;
};
module.exports = { assessmentConverter, assessmentConverterV2 };
