import React from 'react';
import {
  PIPELINE_CONCEPTS,
  PIPELINE_SAMPLE,
  PIPELINE_SCREENS,
  type PipelineConceptId,
  type PipelineConceptRecord,
  type PipelineConceptScreen,
} from './pipelineConceptContract.js';

const conceptConfig: Record<
  PipelineConceptId,
  {
    eyebrow: string;
    accent: string;
    shellLabel: string;
    densityLabel: string;
    heroStat: string;
    heroLabel: string;
    sidebarItems: string[];
  }
> = {
  meridian: {
    eyebrow: 'SMB pipeline motion',
    accent: 'Clear stage ownership and lightweight forecast control.',
    shellLabel: 'Pipeline desk',
    densityLabel: 'Guided pipeline view',
    heroStat: '$1.1M open pipeline',
    heroLabel: 'Closing this quarter',
    sidebarItems: ['Pipeline', 'Accounts', 'Customers', 'Activities', 'Reports'],
  },
  atlas: {
    eyebrow: 'Mid-market deal control',
    accent: 'Forecast confidence, stage clarity, and fast commercial coordination.',
    shellLabel: 'Pipeline workspace',
    densityLabel: 'Executive pipeline view',
    heroStat: '$4.6M weighted pipeline',
    heroLabel: 'Active this quarter',
    sidebarItems: ['Pipeline', 'Accounts', 'Customers', 'Activities', 'Reports'],
  },
  foundry: {
    eyebrow: 'Enterprise revenue control',
    accent: 'Dense stage management, rigorous handoff, and risk visibility.',
    shellLabel: 'Revenue control',
    densityLabel: 'High-density pipeline view',
    heroStat: '34 open motions',
    heroLabel: 'Requiring governance',
    sidebarItems: ['Pipeline', 'Accounts', 'Customers', 'Activities', 'Reports'],
  },
};

const screenTitles: Record<PipelineConceptScreen, string> = {
  list: 'Pipeline board',
  detail: 'Full deal workspace',
  create: 'Create deal',
  edit: 'Edit deal',
  delete: 'Delete confirmation',
};

function getPageTitle(screen: PipelineConceptScreen) {
  if (screen === 'detail') return primaryRecord.name;
  if (screen === 'create') return 'Create deal';
  if (screen === 'edit') return 'Edit deal';
  if (screen === 'delete') return 'Delete deal';
  return 'Pipeline';
}

const healthTone: Record<PipelineConceptRecord['health'], string> = {
  healthy: 'positive',
  watch: 'caution',
  risk: 'neutral',
};

const priorityTone: Record<PipelineConceptRecord['priority'], string> = {
  high: 'premium',
  medium: 'steady',
  low: 'growth',
};

const primaryRecord = PIPELINE_SAMPLE[0];
const secondaryRecord = PIPELINE_SAMPLE[1];
const tertiaryRecord = PIPELINE_SAMPLE[2];
const quaternaryRecord = PIPELINE_SAMPLE[3];

function isConcept(value: string | null): value is PipelineConceptId {
  return PIPELINE_CONCEPTS.some((item) => item.id === value);
}

function isScreen(value: string | null): value is PipelineConceptScreen {
  return PIPELINE_SCREENS.some((item) => item === value);
}

export function getPipelineConceptFromSearch(search: string): {
  conceptId: PipelineConceptId;
  screen: PipelineConceptScreen;
} {
  const params = new URLSearchParams(search);
  const conceptParam = params.get('concept');
  const screenParam = params.get('screen');

  return {
    conceptId: isConcept(conceptParam) ? conceptParam : 'atlas',
    screen: isScreen(screenParam) ? screenParam : 'list',
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function ClampedText(props: { children: React.ReactNode; title?: string; lines?: 1 | 2; className?: string }) {
  const className = [
    'customer-lab__clamp',
    props.lines === 2 ? 'customer-lab__clamp--2' : 'customer-lab__clamp--1',
    props.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className} title={props.title}>
      {props.children}
    </span>
  );
}

function Pill(props: { tone: string; children: React.ReactNode }) {
  return (
    <span className="customer-lab__pill" data-tone={props.tone}>
      {props.children}
    </span>
  );
}

function FieldCard(props: { label: string; value: React.ReactNode; title?: string; lines?: 1 | 2 }) {
  const value =
    typeof props.value === 'string' ? (
      <ClampedText lines={props.lines ?? 1} title={props.title ?? props.value} className="customer-lab__field-value">
        {props.value}
      </ClampedText>
    ) : (
      props.value
    );

  return (
    <div className="customer-lab__field">
      <label>{props.label}</label>
      <div>{value}</div>
    </div>
  );
}

function MetricCard(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="customer-lab__metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function DealIdentity(props: { deal: PipelineConceptRecord; compact?: boolean }) {
  return (
    <div className={`customer-lab__identity${props.compact ? ' customer-lab__identity--compact' : ''}`}>
      <div className="customer-lab__avatar">{props.deal.account.slice(0, 2).toUpperCase()}</div>
      <div className="customer-lab__identity-copy">
        <div className="customer-lab__identity-name" title={props.deal.name}>
          {props.deal.name}
        </div>
        <ClampedText lines={2} title={`${props.deal.account} / ${props.deal.owner}`}>
          {props.deal.account} / {props.deal.owner}
        </ClampedText>
      </div>
    </div>
  );
}

function Sidebar(props: { conceptId: PipelineConceptId; conceptName: string }) {
  const config = conceptConfig[props.conceptId];
  return (
    <aside className="customer-lab__sidebar">
      <div className="customer-lab__brand-block">
        <div className="customer-lab__brand-mark">{props.conceptName.slice(0, 1)}</div>
        <div>
          <div className="customer-lab__brand-eyebrow">{config.eyebrow}</div>
          <div className="customer-lab__brand-name">{config.shellLabel}</div>
        </div>
      </div>
      <nav className="customer-lab__nav">
        {config.sidebarItems.map((item, index) => (
          <button key={item} className="customer-lab__nav-item" data-active={index === 0 ? 'true' : 'false'} type="button">
            <span className="customer-lab__nav-dot" />
            <span>{item}</span>
          </button>
        ))}
      </nav>
      <div className="customer-lab__sidebar-card">
        <div className="customer-lab__section-eyebrow">Forecast</div>
        <div className="customer-lab__sidebar-headline">{config.heroStat}</div>
        <p>{config.accent}</p>
      </div>
    </aside>
  );
}

function TopBar(props: { conceptId: PipelineConceptId; screen: PipelineConceptScreen; title: string }) {
  return (
    <header className="customer-lab__topbar">
      <div>
        <div className="customer-lab__context-label">{props.conceptId === 'atlas' ? 'Atlas workspace' : 'Workspace'}</div>
        <h1>{props.title}</h1>
      </div>
      <div className="customer-lab__topbar-actions">
        <div className="customer-lab__status-chip">{screenTitles[props.screen]}</div>
        <button className="customer-lab__ghost-button" type="button">Share view</button>
      </div>
    </header>
  );
}

function CompactStrip(props: { conceptId: PipelineConceptId }) {
  const config = conceptConfig[props.conceptId];
  return (
    <section className="customer-lab__compact-strip">
      <div className="customer-lab__compact-stat customer-lab__compact-stat--primary">
        <span>Forecast signal</span>
        <strong>{config.heroStat}</strong>
      </div>
      <div className="customer-lab__compact-stat"><span>Forecast</span><strong>$2.3M commit</strong></div>
      <div className="customer-lab__compact-stat"><span>Combined filters</span><strong>Quarter + owner + stage</strong></div>
      <div className="customer-lab__compact-stat"><span>At-risk motions</span><strong>3 flagged deals</strong></div>
    </section>
  );
}

function DealCard(props: { deal: PipelineConceptRecord }) {
  return (
    <div className="customer-lab__deal-card">
      <div className="customer-lab__deal-card-top">
        <strong>{props.deal.name}</strong>
        <Pill tone={priorityTone[props.deal.priority]}>{props.deal.priority}</Pill>
      </div>
      <div className="customer-lab__deal-card-meta">
        <span>{props.deal.account}</span>
        <span>{props.deal.owner}</span>
      </div>
      <div className="customer-lab__deal-card-stats">
        <span>{formatCurrency(props.deal.amount)}</span>
        <span>{props.deal.probability}</span>
      </div>
      <ClampedText lines={2} title={props.deal.nextStep}>
        {props.deal.nextStep}
      </ClampedText>
    </div>
  );
}

function BoardColumn(props: { title: string; items: PipelineConceptRecord[] }) {
  return (
    <section className="customer-lab__board-column">
      <div className="customer-lab__board-column-head">
        <span>{props.title}</span>
        <strong>{props.items.length}</strong>
      </div>
      <div className="customer-lab__board-stack">
        {props.items.map((item) => (
          <DealCard key={item.id} deal={item} />
        ))}
      </div>
    </section>
  );
}

function QuickPreview() {
  return (
    <div className="customer-lab__preview-layer">
      <div className="customer-lab__preview-scrim" />
      <aside className="customer-lab__preview-card customer-lab__preview-card--drawer customer-lab__glass-card">
        <div className="customer-lab__preview-top">
          <div>
            <div className="customer-lab__section-eyebrow">Selected deal</div>
            <div className="customer-lab__section-title">Quick preview</div>
          </div>
          <div className="customer-lab__preview-actions">
            <button className="customer-lab__ghost-button" type="button">Advance stage</button>
            <button className="customer-lab__primary-button" type="button">Open deal</button>
            <button aria-label="More preview actions" className="customer-lab__menu-button" type="button">⋯</button>
          </div>
        </div>
        <div className="customer-lab__preview-stack">
          <DealIdentity deal={primaryRecord} />
          <div className="customer-lab__preview-actions">
            <Pill tone={healthTone[primaryRecord.health]}>{primaryRecord.health}</Pill>
            <Pill tone={priorityTone[primaryRecord.priority]}>{primaryRecord.priority}</Pill>
            <span className="customer-lab__status-chip">Drawer preview</span>
          </div>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Primary actions</div>
            <div className="customer-lab__action-grid customer-lab__action-grid--balanced">
              <button className="customer-lab__primary-button" type="button">Edit deal</button>
              <button className="customer-lab__ghost-button" type="button">Advance stage</button>
              <button aria-label="More deal actions" className="customer-lab__menu-button" type="button">⋯</button>
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Deal snapshot</div>
            <div className="customer-lab__metric-grid">
              <MetricCard label="Account" value={primaryRecord.account} />
              <MetricCard label="Amount" value={formatCurrency(primaryRecord.amount)} />
              <MetricCard label="Probability" value={primaryRecord.probability} />
              <MetricCard label="Close plan" value={formatDate(primaryRecord.closeDate)} />
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Next step</div>
            <div className="customer-lab__preview-note">
              <ClampedText lines={2} title={primaryRecord.nextStep}>{primaryRecord.nextStep}</ClampedText>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function PipelineBoard() {
  const qualification = PIPELINE_SAMPLE.filter((item) => item.stage === 'qualification');
  const solution = PIPELINE_SAMPLE.filter((item) => item.stage === 'solution');
  const proposal = PIPELINE_SAMPLE.filter((item) => item.stage === 'proposal');
  const closePlan = PIPELINE_SAMPLE.filter((item) => item.stage === 'close plan');

  return (
    <div className="customer-lab__table-card">
      <div className="customer-lab__toolbar-stack">
        <div className="customer-lab__toolbar">
          <div className="customer-lab__toolbar-meta">
            <div className="customer-lab__section-eyebrow">Pipeline workspace</div>
            <div className="customer-lab__section-title">Pipeline board</div>
          </div>
          <div className="customer-lab__toolbar-actions-primary">
            <button className="customer-lab__ghost-button" type="button">Table view</button>
            <button className="customer-lab__ghost-button" type="button">Export</button>
            <button className="customer-lab__primary-button" type="button">Add deal</button>
          </div>
        </div>
        <div className="customer-lab__filter-row">
          <div className="customer-lab__input customer-lab__input--search customer-lab__pseudo-control customer-lab__pseudo-control--search">Search deal, account, owner, next step</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Quarter: Q2</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Owner: All</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Stage: Proposal + Close plan</div>
          <button className="customer-lab__ghost-button" type="button">Advanced filters</button>
          <button className="customer-lab__icon-button" type="button">Refresh</button>
        </div>
        <div className="customer-lab__filter-summary">
          <div className="customer-lab__preview-actions">
            <span className="customer-lab__selection-note">Commit view active</span>
            <span className="customer-lab__filter-chip">Late stage</span>
            <span className="customer-lab__filter-chip">High priority</span>
            <span className="customer-lab__filter-chip">Owner coverage</span>
          </div>
          <span>7 matching deals / 3 saved views</span>
        </div>
      </div>
      <div className="customer-lab__board-grid">
        <BoardColumn title="Qualification" items={qualification} />
        <BoardColumn title="Solution" items={solution} />
        <BoardColumn title="Proposal" items={proposal} />
        <BoardColumn title="Close plan" items={closePlan} />
      </div>
    </div>
  );
}

function DetailScreen() {
  return (
    <section className="customer-lab__detail-shell">
      <aside className="customer-lab__detail-left">
        <section className="customer-lab__panel customer-lab__panel--sticky">
          <div className="customer-lab__section-eyebrow">Deal summary</div>
          <DealIdentity deal={primaryRecord} />
          <div className="customer-lab__summary-pills">
            <Pill tone={healthTone[primaryRecord.health]}>{primaryRecord.health}</Pill>
            <Pill tone={priorityTone[primaryRecord.priority]}>{primaryRecord.priority}</Pill>
          </div>
          <p className="customer-lab__panel-caption">Keep stage progression, forecast posture, and one next move visible while the deal record stays central.</p>
          <div className="customer-lab__action-grid customer-lab__action-grid--balanced">
            <button className="customer-lab__primary-button" type="button">Edit deal</button>
            <button className="customer-lab__ghost-button" type="button">Advance stage</button>
            <button aria-label="More deal actions" className="customer-lab__menu-button" type="button">⋯</button>
          </div>
          <div className="customer-lab__metric-grid">
            <MetricCard label="Amount" value={formatCurrency(primaryRecord.amount)} />
            <MetricCard label="Probability" value={primaryRecord.probability} />
            <MetricCard label="Stage" value="Proposal" />
            <MetricCard label="Close date" value={formatDate(primaryRecord.closeDate)} />
          </div>
        </section>

        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Deal context</div>
          <div className="customer-lab__panel-list">
            <div className="customer-lab__detail-item"><span>Account</span><strong>{primaryRecord.account}</strong></div>
            <div className="customer-lab__detail-item"><span>Owner</span><strong>{primaryRecord.owner}</strong></div>
            <div className="customer-lab__detail-item"><span>Created</span><strong>{formatDate(primaryRecord.createdAt)}</strong></div>
            <div className="customer-lab__detail-item"><span>Updated</span><strong>{formatDate(primaryRecord.updatedAt)}</strong></div>
          </div>
        </section>

        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Progress posture</div>
          <div className="customer-lab__panel-list">
            <div className="customer-lab__detail-item"><span>Champion readiness</span><strong>High internal engagement</strong></div>
            <div className="customer-lab__detail-item"><span>Approval path</span><strong>Legal and procurement in review</strong></div>
            <div className="customer-lab__detail-item"><span>Primary risk</span><strong>Commercial validation timing</strong></div>
          </div>
        </section>
      </aside>
      <div className="customer-lab__detail-center">
        <section className="customer-lab__panel customer-lab__panel--command">
          <div className="customer-lab__detail-head customer-lab__detail-head--compact">
            <div>
              <div className="customer-lab__section-eyebrow">Deal profile</div>
              <div className="customer-lab__section-title customer-lab__section-title--lg">{primaryRecord.name}</div>
            </div>
            <div className="customer-lab__preview-actions">
              <button className="customer-lab__ghost-button" type="button">Delete</button>
              <button className="customer-lab__primary-button" type="button">Edit deal</button>
              <button aria-label="More deal profile actions" className="customer-lab__menu-button" type="button">⋯</button>
            </div>
          </div>
          <div className="customer-lab__command-strip">
            <div className="customer-lab__command-item"><span>Account</span><strong>{primaryRecord.account}</strong></div>
            <div className="customer-lab__command-item"><span>Owner</span><strong>{primaryRecord.owner}</strong></div>
            <div className="customer-lab__command-item"><span>Forecast</span><strong>{primaryRecord.probability}</strong></div>
            <div className="customer-lab__command-item"><span>Close plan</span><strong>{formatDate(primaryRecord.closeDate)}</strong></div>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Commercial motion</div>
          <div className="customer-lab__section-title">Commercial motion</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Account" value={primaryRecord.account} />
            <FieldCard label="Owner" value={primaryRecord.owner} />
            <FieldCard label="Stage" value="Proposal" />
            <FieldCard label="Amount" value={formatCurrency(primaryRecord.amount)} />
            <FieldCard label="Probability" value={primaryRecord.probability} />
            <FieldCard label="Next step" value={primaryRecord.nextStep} lines={2} />
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Mutual action plan</div>
          <div className="customer-lab__section-title">Mutual action plan</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Current focus" value="Resolve commercial and security appendix before final proposal review." lines={2} />
            <FieldCard label="Customer dependency" value="Procurement feedback must land before executive sign-off." lines={2} />
            <FieldCard label="Internal coordination" value="Sales, legal, and solutions engineering aligned in one workstream." lines={2} />
            <FieldCard label="Overflow handling" value="Long next steps and notes stay clamped until a user intentionally expands them." lines={2} />
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Stage history</div>
          <div className="customer-lab__stack">
            <div className="customer-lab__detail-item"><span>Qualification</span><strong>Mar 4</strong></div>
            <div className="customer-lab__detail-item"><span>Solution</span><strong>Mar 18</strong></div>
            <div className="customer-lab__detail-item"><span>Proposal</span><strong>Mar 29</strong></div>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Buying committee</div>
          <div className="customer-lab__stack">
            {primaryRecord.contacts.map((contact) => (
              <div key={contact} className="customer-lab__detail-item"><span>Contact</span><strong>{contact}</strong></div>
            ))}
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Notes</div>
          <div className="customer-lab__notes-card">
            <div className="customer-lab__notes-clamp" title={primaryRecord.notes}>
              {primaryRecord.notes}
            </div>
            <button className="customer-lab__text-button" type="button">Show full deal note</button>
          </div>
        </section>
      </div>
      <aside className="customer-lab__detail-right">
        <section className="customer-lab__panel customer-lab__panel--sticky customer-lab__glass-card">
          <div className="customer-lab__section-eyebrow">Risk signals</div>
          <div className="customer-lab__stack">
            <div className="customer-lab__detail-item"><span>Legal review</span><strong>In progress</strong></div>
            <div className="customer-lab__detail-item"><span>Pricing pressure</span><strong>Contained</strong></div>
            <div className="customer-lab__detail-item"><span>Close confidence</span><strong>Improving</strong></div>
            <div className="customer-lab__detail-item"><span>Field density</span><strong>Drawer preview protects board space</strong></div>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Related motions</div>
          <div className="customer-lab__compact-card"><DealIdentity deal={secondaryRecord} compact /></div>
          <div className="customer-lab__compact-card"><DealIdentity deal={tertiaryRecord} compact /></div>
          <div className="customer-lab__compact-card"><DealIdentity deal={quaternaryRecord} compact /></div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Approval path</div>
          <div className="customer-lab__stack">
            <div className="customer-lab__detail-item"><span>Commercial review</span><strong>Completed</strong></div>
            <div className="customer-lab__detail-item"><span>Security appendix</span><strong>Needs approval</strong></div>
            <div className="customer-lab__detail-item"><span>Procurement sign-off</span><strong>Queued</strong></div>
          </div>
        </section>
      </aside>
    </section>
  );
}

function Drawer(props: { mode: 'create' | 'edit' }) {
  const isCreate = props.mode === 'create';
  return (
    <section className="customer-lab__single-screen">
      <div className="customer-lab__drawer customer-lab__glass-card">
        <div className="customer-lab__drawer-head">
          <div>
            <div className="customer-lab__section-eyebrow">Atlas workspace</div>
            <div className="customer-lab__section-title customer-lab__section-title--lg">{isCreate ? 'Create deal' : 'Edit deal'}</div>
            <p>{isCreate ? 'Capture the deal profile, stage context, and commercial motion before saving.' : 'Review the current deal profile, update the changed fields, and save when the draft is ready.'}</p>
          </div>
          <div className="customer-lab__preview-actions">
            <button className="customer-lab__ghost-button" type="button">Cancel</button>
            <button className="customer-lab__primary-button" type="button">{isCreate ? 'Create deal' : 'Save changes'}</button>
          </div>
        </div>
        <div className="customer-lab__drawer-flags">
          <span className="customer-lab__status-chip">Section map</span>
          <span className="customer-lab__status-chip">Deal profile</span>
          <span className="customer-lab__status-chip">Commercial motion</span>
          {!isCreate ? <span className="customer-lab__status-chip">Review before save</span> : null}
        </div>
        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Deal profile</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Deal name" value={isCreate ? 'Harbor rollout expansion' : primaryRecord.name} />
            <FieldCard label="Account" value={isCreate ? 'Harbor Commerce' : primaryRecord.account} />
            <FieldCard label="Owner" value={isCreate ? 'Ella Brooks' : primaryRecord.owner} />
            <FieldCard label="Stage" value={isCreate ? 'Qualification' : 'Proposal'} />
            <FieldCard label="Amount" value={isCreate ? '$64,000' : formatCurrency(primaryRecord.amount)} />
            <FieldCard label="Close date" value={isCreate ? 'May 16, 2026' : formatDate(primaryRecord.closeDate)} />
          </div>
        </section>
        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Commercial motion</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Probability" value={isCreate ? '28%' : primaryRecord.probability} />
            <FieldCard label="Priority" value={isCreate ? 'medium' : primaryRecord.priority} />
            <FieldCard label="Health" value={isCreate ? 'watch' : primaryRecord.health} />
            <FieldCard label="Next step" value={isCreate ? 'Run discovery with operations sponsor' : primaryRecord.nextStep} lines={2} />
            <FieldCard label="Notes" value={isCreate ? 'Early-stage motion with strong champion interest but incomplete scope.' : primaryRecord.notes} lines={2} />
          </div>
        </section>
      </div>
    </section>
  );
}

function DeleteDialog() {
  return (
    <section className="customer-lab__single-screen">
      <PipelineBoard />
      <div className="customer-lab__modal-backdrop">
        <div className="customer-lab__modal customer-lab__glass-card">
          <div className="customer-lab__section-eyebrow">Atlas workspace</div>
          <div className="customer-lab__section-title customer-lab__section-title--lg">Delete deal</div>
          <p>This action removes the deal from the active workspace, including <strong>{primaryRecord.name}</strong>, forecast context, and stage history.</p>
          <div className="customer-lab__section-eyebrow">Deletion impact</div>
          <div className="customer-lab__modal-summary">
            <div className="customer-lab__detail-item"><span>Deal</span><strong>{primaryRecord.name}</strong></div>
            <div className="customer-lab__detail-item"><span>Amount</span><strong>{formatCurrency(primaryRecord.amount)}</strong></div>
            <div className="customer-lab__detail-item"><span>Stage</span><strong>Proposal</strong></div>
          </div>
          <div className="customer-lab__modal-actions">
            <button className="customer-lab__text-button" type="button">Export deal</button>
            <button className="customer-lab__ghost-button" type="button">Cancel</button>
            <button className="customer-lab__danger-button" type="button">Delete deal</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Screen(props: { screen: PipelineConceptScreen }) {
  if (props.screen === 'detail') return <DetailScreen />;
  if (props.screen === 'create') return <Drawer mode="create" />;
  if (props.screen === 'edit') return <Drawer mode="edit" />;
  if (props.screen === 'delete') return <DeleteDialog />;
  return (
    <section className="customer-lab__list-stage">
      <PipelineBoard />
      <QuickPreview />
    </section>
  );
}

export function PipelineConceptLab(props: { conceptId: PipelineConceptId; screen: PipelineConceptScreen }) {
  const concept = PIPELINE_CONCEPTS.find((item) => item.id === props.conceptId) ?? PIPELINE_CONCEPTS[1];
  const pageTitle = getPageTitle(props.screen);
  return (
    <div className="customer-lab" data-theme={concept.id}>
      <Sidebar conceptId={concept.id} conceptName={concept.name} />
      <main className="customer-lab__main">
        <TopBar conceptId={concept.id} screen={props.screen} title={pageTitle} />
        {props.screen === 'list' ? <CompactStrip conceptId={concept.id} /> : null}
        <Screen screen={props.screen} />
      </main>
    </div>
  );
}
