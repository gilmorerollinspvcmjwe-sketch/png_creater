import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PipelineConceptLab } from '../src/concepts/PipelineConceptLab.js';

const assert = {
  match(value: string, pattern: RegExp) {
    if (!pattern.test(value)) {
      throw new Error(`Expected output to match ${String(pattern)}`);
    }
  },
  notMatch(value: string, pattern: RegExp) {
    if (pattern.test(value)) {
      throw new Error(`Expected output not to match ${String(pattern)}`);
    }
  },
};

const listHtml = renderToStaticMarkup(
  React.createElement(PipelineConceptLab, {
    conceptId: 'atlas',
    screen: 'list',
  })
);

const detailHtml = renderToStaticMarkup(
  React.createElement(PipelineConceptLab, {
    conceptId: 'atlas',
    screen: 'detail',
  })
);

const createHtml = renderToStaticMarkup(
  React.createElement(PipelineConceptLab, {
    conceptId: 'atlas',
    screen: 'create',
  })
);

const editHtml = renderToStaticMarkup(
  React.createElement(PipelineConceptLab, {
    conceptId: 'atlas',
    screen: 'edit',
  })
);

const deleteHtml = renderToStaticMarkup(
  React.createElement(PipelineConceptLab, {
    conceptId: 'atlas',
    screen: 'delete',
  })
);

assert.match(listHtml, /Atlas workspace/);
assert.match(listHtml, /<h1>Pipeline<\/h1>/);
assert.match(listHtml, /Pipeline board/);
assert.match(listHtml, /Forecast/);
assert.match(listHtml, /Qualification/);
assert.match(listHtml, /Proposal/);
assert.match(listHtml, /Close plan/);
assert.match(listHtml, /Quick preview/);
assert.match(detailHtml, /<h1>Northstar platform expansion<\/h1>/);
assert.match(detailHtml, /Atlas workspace/);
assert.match(detailHtml, /Deal summary/);
assert.match(detailHtml, /Deal profile/);
assert.match(detailHtml, /Commercial motion/);
assert.match(detailHtml, /Stage history/);
assert.match(detailHtml, /Buying committee/);
assert.match(detailHtml, /Risk signals/);
assert.match(detailHtml, /Show full deal note/);
assert.match(createHtml, /<h1>Create deal<\/h1>/);
assert.match(createHtml, /Create deal/);
assert.match(createHtml, /Section map/);
assert.match(createHtml, /Deal profile/);
assert.match(editHtml, /<h1>Edit deal<\/h1>/);
assert.match(editHtml, /Edit deal/);
assert.match(editHtml, /Review before save/);
assert.match(deleteHtml, /<h1>Delete deal<\/h1>/);
assert.match(deleteHtml, /Deletion impact/);
assert.match(deleteHtml, /Export deal/);
assert.match(deleteHtml, /This action removes the deal from the active workspace/);
assert.notMatch(deleteHtml, /Delete deal record/);

console.log('pipeline concept lab render ok');
