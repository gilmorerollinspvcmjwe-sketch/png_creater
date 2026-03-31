import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountConceptLab } from '../src/concepts/AccountConceptLab.js';

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
  React.createElement(AccountConceptLab, {
    conceptId: 'atlas',
    screen: 'list',
  })
);

const detailHtml = renderToStaticMarkup(
  React.createElement(AccountConceptLab, {
    conceptId: 'atlas',
    screen: 'detail',
  })
);

const createHtml = renderToStaticMarkup(
  React.createElement(AccountConceptLab, {
    conceptId: 'atlas',
    screen: 'create',
  })
);

const deleteHtml = renderToStaticMarkup(
  React.createElement(AccountConceptLab, {
    conceptId: 'atlas',
    screen: 'delete',
  })
);

assert.match(listHtml, /Atlas workspace/);
assert.match(listHtml, /<h1>Accounts<\/h1>/);
assert.match(listHtml, /Accounts/);
assert.match(listHtml, /Quick preview/);
assert.match(listHtml, /Open deals/);
assert.match(listHtml, /Renewal/);
assert.match(listHtml, /ARR/);
assert.match(detailHtml, /<h1>Northstar HQ<\/h1>/);
assert.match(detailHtml, /Atlas workspace/);
assert.match(detailHtml, /Account summary/);
assert.match(detailHtml, /Company profile/);
assert.match(detailHtml, /Commercial context/);
assert.match(detailHtml, /Related contacts/);
assert.match(detailHtml, /Risk signals/);
assert.match(detailHtml, /Open deals/);
assert.match(detailHtml, /Show full account note/);
assert.match(createHtml, /<h1>Create account<\/h1>/);
assert.match(createHtml, /Create account/);
assert.match(createHtml, /Section map/);
assert.match(createHtml, /Company profile/);
assert.match(createHtml, /Commercial context/);
assert.match(deleteHtml, /<h1>Delete account<\/h1>/);
assert.match(deleteHtml, /Deletion impact/);
assert.match(deleteHtml, /Export account/);
assert.match(deleteHtml, /This action removes the account from the active workspace/);
assert.notMatch(deleteHtml, /Delete account record/);

console.log('account concept lab render ok');
