import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomerConceptLab } from '../src/concepts/CustomerConceptLab.js';

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

const html = renderToStaticMarkup(
  React.createElement(CustomerConceptLab, {
    conceptId: 'atlas',
    screen: 'list',
  })
);

const detailHtml = renderToStaticMarkup(
  React.createElement(CustomerConceptLab, {
    conceptId: 'atlas',
    screen: 'detail',
  })
);

const createHtml = renderToStaticMarkup(
  React.createElement(CustomerConceptLab, {
    conceptId: 'atlas',
    screen: 'create',
  })
);

const editHtml = renderToStaticMarkup(
  React.createElement(CustomerConceptLab, {
    conceptId: 'atlas',
    screen: 'edit',
  })
);

const deleteHtml = renderToStaticMarkup(
  React.createElement(CustomerConceptLab, {
    conceptId: 'atlas',
    screen: 'delete',
  })
);

assert.match(html, /Atlas workspace/);
assert.match(html, /<h1>Customers<\/h1>/);
assert.match(html, /Customers/);
assert.match(html, /Quick preview/);
assert.match(html, /Export/);
assert.match(html, /Add customer/);
assert.match(html, /Bulk assign/);
assert.match(html, /Bulk tag/);
assert.match(html, /Bulk export/);
assert.match(html, /mailto:/);
assert.match(html, /tel:/);
assert.notMatch(html, /Pending actions/);
assert.match(detailHtml, /<h1>Avery Coleman<\/h1>/);
assert.match(detailHtml, /Atlas workspace/);
assert.match(detailHtml, /Customer summary/);
assert.match(detailHtml, /Core details/);
assert.match(detailHtml, /Field groups/);
assert.match(detailHtml, /Commercial context/);
assert.match(detailHtml, /System fields/);
assert.match(detailHtml, /Operations rail/);
assert.match(detailHtml, /Data coverage/);
assert.match(detailHtml, /Activity timeline/);
assert.match(detailHtml, /Custom fields/);
assert.match(detailHtml, /Pinned fields/);
assert.match(detailHtml, /All custom fields \(18\)/);
assert.match(detailHtml, /Show all custom fields/);
assert.match(detailHtml, /mailto:/);
assert.match(detailHtml, /tel:/);
assert.match(detailHtml, /Show full customer note/);
assert.match(detailHtml, /Edit customer/);
assert.match(detailHtml, /Delete/);
assert.match(createHtml, /<h1>Create customer<\/h1>/);
assert.match(createHtml, /Section map/);
assert.match(createHtml, /Primary record/);
assert.match(createHtml, /Generated on save/);
assert.match(createHtml, /Custom fields/);
assert.match(editHtml, /<h1>Edit customer<\/h1>/);
assert.match(editHtml, /Unsaved changes/);
assert.match(editHtml, /Review before save/);
assert.match(deleteHtml, /<h1>Delete customer<\/h1>/);
assert.match(deleteHtml, /Deletion impact/);
assert.match(deleteHtml, /Export record/);
assert.match(deleteHtml, /This action removes the record from the active workspace/);
assert.notMatch(deleteHtml, /Type DELETE to continue/);

console.log('customer concept lab render ok');
