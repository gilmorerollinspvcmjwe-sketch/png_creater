# Atlas 五类页面统一收敛改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Atlas 下 `Customers`、`Accounts`、`Pipeline` 的 `list / detail / create / edit / delete` 五类页面按已确认 spec 收紧成更可信的 B2B SaaS 工作界面。

**Architecture:** 保持现有三组概念页的结构和数据来源不变，只在共享样式与三个概念组件内收敛标题层级、动作数量、删除流程和文案。先用现有 render 测试锁定新结构，再做最小实现修改，最后跑类型检查、构建和概念页 render 验证。

**Tech Stack:** React 18、TypeScript、Vite、服务端静态渲染测试（`renderToStaticMarkup`）、共享 CSS

---

## 文件结构

- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\customerConceptStyles.css`
  - 负责 Atlas 主题下的层级、按钮、表面、伪控件和删除对话框样式收敛
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\CustomerConceptLab.tsx`
  - 负责 Customers 五类页面的标题、动作、文案和删除流程统一
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\AccountConceptLab.tsx`
  - 负责 Accounts 五类页面的标题、动作、文案和删除流程统一
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\PipelineConceptLab.tsx`
  - 负责 Pipeline 五类页面的标题、动作、文案和删除流程统一
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\customerConceptLabRender.ts`
  - 锁定 Customers Atlas 页面结构和文案变化
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\accountConceptLabRender.ts`
  - 锁定 Accounts Atlas 页面结构和文案变化
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\pipelineConceptLabRender.ts`
  - 锁定 Pipeline Atlas 页面结构和文案变化
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\CONTEXT.md`
  - 记录这一轮实施结果

### Task 1: 锁定新的 Atlas 页面断言

**Files:**
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\customerConceptLabRender.ts`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\accountConceptLabRender.ts`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\pipelineConceptLabRender.ts`

- [ ] **Step 1: 写失败测试，改成新断言**

```ts
assert.match(html, /Atlas workspace/);
assert.match(html, /<h1>Customers<\/h1>/);
assert.match(detailHtml, /<h1>Avery Stone<\/h1>/);
assert.match(createHtml, /<h1>Create customer<\/h1>/);
assert.match(deleteHtml, /Delete customer/);
assert.notMatch(deleteHtml, /Type DELETE to continue/);
assert.match(deleteHtml, /This action removes the record from the active workspace/);
assert.match(detailHtml, /Show full customer note/);
```

```ts
assert.match(listHtml, /Atlas workspace/);
assert.match(listHtml, /<h1>Accounts<\/h1>/);
assert.match(detailHtml, /<h1>Northstar Industrial<\/h1>/);
assert.match(createHtml, /<h1>Create account<\/h1>/);
assert.match(deleteHtml, /Delete account/);
assert.match(deleteHtml, /This action removes the account from the active workspace/);
assert.match(detailHtml, /Show full account note/);
```

```ts
assert.match(listHtml, /Atlas workspace/);
assert.match(listHtml, /<h1>Pipeline<\/h1>/);
assert.match(detailHtml, /<h1>Northstar platform expansion<\/h1>/);
assert.match(createHtml, /<h1>Create deal<\/h1>/);
assert.match(editHtml, /<h1>Edit deal<\/h1>/);
assert.match(deleteHtml, /Delete deal/);
assert.match(deleteHtml, /This action removes the deal from the active workspace/);
assert.match(detailHtml, /Show full deal note/);
```

- [ ] **Step 2: 运行测试，确认按预期失败**

Run:

```bash
npx tsc tests/customerConceptLabRender.ts --outDir .tmp-tests-atlas-render --rootDir . --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck
node .tmp-tests-atlas-render/tests/customerConceptLabRender.js
```

Expected: FAIL，旧页面仍输出旧主标题、旧删除文案或旧展开文案。

Run:

```bash
npx tsc tests/accountConceptLabRender.ts --outDir .tmp-tests-atlas-render --rootDir . --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck
node .tmp-tests-atlas-render/tests/accountConceptLabRender.js
```

Expected: FAIL，旧页面仍输出旧主标题和旧删除文案。

Run:

```bash
npx tsc tests/pipelineConceptLabRender.ts --outDir .tmp-tests-atlas-render --rootDir . --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck
node .tmp-tests-atlas-render/tests/pipelineConceptLabRender.js
```

Expected: FAIL，旧页面仍输出旧主标题和旧删除文案。

- [ ] **Step 3: 提交测试修改**

```bash
git add tests/customerConceptLabRender.ts tests/accountConceptLabRender.ts tests/pipelineConceptLabRender.ts
git commit -m "test: lock Atlas five-screen refinement expectations"
```

### Task 2: 收紧共享样式和通用 Atlas 顶部结构

**Files:**
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\customerConceptStyles.css`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\CustomerConceptLab.tsx`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\AccountConceptLab.tsx`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\PipelineConceptLab.tsx`
- Test: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\customerConceptLabRender.ts`
- Test: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\accountConceptLabRender.ts`
- Test: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\pipelineConceptLabRender.ts`

- [ ] **Step 1: 在 CSS 中加 Atlas 收敛样式**

```css
.customer-lab[data-theme='atlas'] {
  --surface-strong: #ffffff;
  --surface-muted: #f5f7fb;
  --shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  --shadow-soft: 0 6px 16px rgba(15, 23, 42, 0.04);
}

.customer-lab[data-theme='atlas'] .customer-lab__glass-card {
  background: #ffffff;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.customer-lab__context-label {
  display: inline-flex;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(20, 32, 51, 0.05);
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 2: 在三个概念页统一改 TopBar**

```tsx
function TopBar(props: { ...; title: string; contextLabel: string }) {
  return (
    <header className="customer-lab__topbar">
      <div>
        <div className="customer-lab__context-label">{props.contextLabel}</div>
        <h1>{props.title}</h1>
      </div>
      <div className="customer-lab__topbar-actions">
        <div className="customer-lab__status-chip">{screenTitles[props.screen]}</div>
        <button className="customer-lab__ghost-button" type="button">
          Share view
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: 只在 list 页面保留轻量摘要条**

```tsx
<main className="customer-lab__main">
  <TopBar ... title={pageTitle} contextLabel="Atlas workspace" />
  {props.screen === 'list' ? <CompactStrip conceptId={concept.id} /> : null}
  <Screen screen={props.screen} />
</main>
```

- [ ] **Step 4: 运行 render 测试，确认主标题和 Atlas 标签通过**

Run:

```bash
npx tsc tests/customerConceptLabRender.ts tests/accountConceptLabRender.ts tests/pipelineConceptLabRender.ts --outDir .tmp-tests-atlas-render --rootDir . --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck
node .tmp-tests-atlas-render/tests/customerConceptLabRender.js
node .tmp-tests-atlas-render/tests/accountConceptLabRender.js
node .tmp-tests-atlas-render/tests/pipelineConceptLabRender.js
```

Expected: 仍可能有后续断言失败，但主标题和 `Atlas workspace` 相关断言应转绿或接近转绿。

- [ ] **Step 5: 提交样式和顶部结构修改**

```bash
git add src/concepts/customerConceptStyles.css src/concepts/CustomerConceptLab.tsx src/concepts/AccountConceptLab.tsx src/concepts/PipelineConceptLab.tsx
git commit -m "feat: refine Atlas page hierarchy"
```

### Task 3: 完成五类页面的动作、文案和删除流程统一

**Files:**
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\customerConceptStyles.css`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\CustomerConceptLab.tsx`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\AccountConceptLab.tsx`
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\src\concepts\PipelineConceptLab.tsx`
- Test: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\customerConceptLabRender.ts`
- Test: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\accountConceptLabRender.ts`
- Test: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\tests\pipelineConceptLabRender.ts`

- [ ] **Step 1: 收敛列表和详情动作**

```tsx
<div className="customer-lab__action-grid customer-lab__action-grid--balanced">
  <button className="customer-lab__primary-button" type="button">Open profile</button>
  <button className="customer-lab__ghost-button" type="button">Log activity</button>
  <button aria-label="More preview actions" className="customer-lab__menu-button" type="button">⋯</button>
</div>
```

```tsx
function ListActions() {
  return (
    <div className="customer-lab__row-actions">
      <button aria-label="More row actions" className="customer-lab__menu-button" type="button">⋯</button>
    </div>
  );
}
```

- [ ] **Step 2: 把展开文案改成对象语义**

```tsx
<button className="customer-lab__text-button" type="button">
  Show full customer note
</button>
```

```tsx
<button className="customer-lab__text-button" type="button">
  Show full account note
</button>
```

```tsx
<button className="customer-lab__text-button" type="button">
  Show full deal note
</button>
```

- [ ] **Step 3: 统一 create / edit 的任务导向开头**

```tsx
<div className="customer-lab__section-eyebrow">{isCreate ? 'Atlas workspace' : 'Atlas workspace'}</div>
<div className="customer-lab__section-title customer-lab__section-title--lg">
  {isCreate ? 'Create customer' : 'Edit customer'}
</div>
<p>Complete the primary record, commercial context, and custom fields before saving.</p>
```

- [ ] **Step 4: 统一 delete 页面危险操作文案**

```tsx
<div className="customer-lab__section-eyebrow">Atlas workspace</div>
<div className="customer-lab__section-title customer-lab__section-title--lg">Delete customer</div>
<p>
  This action removes the record from the active workspace, including notes, tags, and relationship history.
</p>
```

```tsx
<div className="customer-lab__modal-actions">
  <button className="customer-lab__text-button" type="button">Export record</button>
  <button className="customer-lab__ghost-button" type="button">Cancel</button>
  <button className="customer-lab__danger-button" type="button">Delete customer</button>
</div>
```

- [ ] **Step 5: 补删除页和伪控件的 Atlas 样式**

```css
.customer-lab__pseudo-control {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-soft);
}

.customer-lab__modal-actions .customer-lab__text-button {
  font-size: 13px;
}
```

- [ ] **Step 6: 运行全部 Atlas render 测试，确认转绿**

Run:

```bash
npx tsc tests/customerConceptLabRender.ts tests/accountConceptLabRender.ts tests/pipelineConceptLabRender.ts --outDir .tmp-tests-atlas-render --rootDir . --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck
node .tmp-tests-atlas-render/tests/customerConceptLabRender.js
node .tmp-tests-atlas-render/tests/accountConceptLabRender.js
node .tmp-tests-atlas-render/tests/pipelineConceptLabRender.js
```

Expected:

- `customer concept lab render ok`
- `account concept lab render ok`
- `pipeline concept lab render ok`

- [ ] **Step 7: 提交页面统一收敛修改**

```bash
git add src/concepts/customerConceptStyles.css src/concepts/CustomerConceptLab.tsx src/concepts/AccountConceptLab.tsx src/concepts/PipelineConceptLab.tsx
git commit -m "feat: refine Atlas five-screen concepts"
```

### Task 4: 最终验证、记录与本地预览

**Files:**
- Modify: `C:\Users\13609\.openclaw\workspace\crm-frontend-clean\CONTEXT.md`

- [ ] **Step 1: 运行类型检查**

Run:

```bash
npm run type-check
```

Expected: exit code 0。

- [ ] **Step 2: 运行生产构建**

Run:

```bash
npm run build
```

Expected: Vite build 成功；允许已有 chunk-size warning。

- [ ] **Step 3: 更新 CONTEXT**

```md
- Implemented Atlas-only five-screen refinement across customer, account, and pipeline concepts.
- Updated render tests to lock new page hierarchy, delete copy, and note-expansion copy.
- Verified with render tests, type-check, and build.
```

- [ ] **Step 4: 启动本地预览并打开 Atlas 页面**

Run:

```bash
npm run dev -- --host 127.0.0.1 --clearScreen false
```

Then open:

```bash
Start-Process 'http://127.0.0.1:3000/?view=concepts&concept=atlas&screen=list'
Start-Process 'http://127.0.0.1:3000/?view=concepts&object=accounts&concept=atlas&screen=list'
Start-Process 'http://127.0.0.1:3000/?view=concepts&object=pipeline&concept=atlas&screen=list'
```

- [ ] **Step 5: 提交验证与记录**

```bash
git add CONTEXT.md
git commit -m "docs: record Atlas five-screen refinement"
```
