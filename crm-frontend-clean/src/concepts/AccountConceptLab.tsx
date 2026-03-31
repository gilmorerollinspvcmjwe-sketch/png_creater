import React from 'react';
import {
  ACCOUNT_CONCEPTS,
  ACCOUNT_SAMPLE,
  ACCOUNT_SCREENS,
  type AccountConceptId,
  type AccountConceptRecord,
  type AccountConceptScreen,
} from './accountConceptContract.js';

const conceptConfig: Record<
  AccountConceptId,
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
    eyebrow: 'SMB account growth',
    accent: 'Clear ownership, renewal posture, and light account planning.',
    shellLabel: 'Account desk',
    densityLabel: 'Guided account view',
    heroStat: '$1.9M managed ARR',
    heroLabel: 'Reviewed this month',
    sidebarItems: ['Accounts', 'Customers', 'Pipeline', 'Activities', 'Reports'],
  },
  atlas: {
    eyebrow: 'Mid-market account planning',
    accent: 'Commercial clarity, relationship depth, and renewal confidence.',
    shellLabel: 'Account workspace',
    densityLabel: 'Executive account view',
    heroStat: '$6.2M active ARR',
    heroLabel: 'In managed portfolio',
    sidebarItems: ['Accounts', 'Customers', 'Pipeline', 'Activities', 'Reports'],
  },
  foundry: {
    eyebrow: 'Enterprise portfolio control',
    accent: 'Risk visibility, account governance, and durable operating discipline.',
    shellLabel: 'Portfolio control',
    densityLabel: 'High-density account view',
    heroStat: '28 flagged renewals',
    heroLabel: 'Under active governance',
    sidebarItems: ['Accounts', 'Customers', 'Pipeline', 'Activities', 'Reports'],
  },
};

const screenTitles: Record<AccountConceptScreen, string> = {
  list: 'Account list with commercial preview',
  detail: 'Full account workspace',
  create: 'Create account',
  edit: 'Edit account',
  delete: 'Delete confirmation',
};

function getPageTitle(screen: AccountConceptScreen) {
  if (screen === 'detail') return primaryRecord.name;
  if (screen === 'create') return 'Create account';
  if (screen === 'edit') return 'Edit account';
  if (screen === 'delete') return 'Delete account';
  return 'Accounts';
}

const healthTone: Record<AccountConceptRecord['health'], string> = {
  healthy: 'positive',
  watch: 'caution',
  risk: 'neutral',
};

const tierTone: Record<AccountConceptRecord['tier'], string> = {
  strategic: 'premium',
  growth: 'growth',
  managed: 'steady',
};

const primaryRecord = ACCOUNT_SAMPLE[0];
const secondaryRecord = ACCOUNT_SAMPLE[1];
const tertiaryRecord = ACCOUNT_SAMPLE[2];
const quaternaryRecord = ACCOUNT_SAMPLE[3];

const customFields = [
  { label: 'Procurement model', value: 'Central procurement with security checkpoint' },
  { label: 'CS coverage', value: 'Named CSM plus renewal manager' },
  { label: 'Expansion motion', value: 'Platform expansion in Q3 planning cycle' },
  { label: 'Data residency', value: 'US primary / EU review requested' },
] as const;

function isConcept(value: string | null): value is AccountConceptId {
  return ACCOUNT_CONCEPTS.some((item) => item.id === value);
}

function isScreen(value: string | null): value is AccountConceptScreen {
  return ACCOUNT_SCREENS.some((item) => item === value);
}

export function getAccountConceptFromSearch(search: string): {
  conceptId: AccountConceptId;
  screen: AccountConceptScreen;
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();
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

function PlainLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a className="customer-lab__meta-link" href={props.href} target="_blank" rel="noreferrer">
      {props.children}
    </a>
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

function AccountIdentity(props: { account: AccountConceptRecord; compact?: boolean }) {
  return (
    <div className={`customer-lab__identity${props.compact ? ' customer-lab__identity--compact' : ''}`}>
      <div className="customer-lab__avatar">{getInitials(props.account.name)}</div>
      <div className="customer-lab__identity-copy">
        <div className="customer-lab__identity-name" title={props.account.name}>
          {props.account.name}
        </div>
        <ClampedText lines={2} title={`${props.account.industry} / ${props.account.region}`}>
          {props.account.industry} / {props.account.region}
        </ClampedText>
      </div>
    </div>
  );
}

function Sidebar(props: { conceptId: AccountConceptId; conceptName: string }) {
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
        <div className="customer-lab__section-eyebrow">Revenue operations</div>
        <div className="customer-lab__sidebar-headline">{config.heroStat}</div>
        <p>{config.accent}</p>
      </div>
    </aside>
  );
}

function TopBar(props: { conceptId: AccountConceptId; screen: AccountConceptScreen; title: string }) {
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

function CompactStrip(props: { conceptId: AccountConceptId }) {
  const config = conceptConfig[props.conceptId];
  return (
    <section className="customer-lab__compact-strip">
      <div className="customer-lab__compact-stat customer-lab__compact-stat--primary">
        <span>Portfolio signal</span>
        <strong>{config.heroStat}</strong>
      </div>
      <div className="customer-lab__compact-stat"><span>Renewals in 90 days</span><strong>11 accounts</strong></div>
      <div className="customer-lab__compact-stat"><span>Combined filters</span><strong>Health + tier + ARR</strong></div>
      <div className="customer-lab__compact-stat"><span>Open opportunities</span><strong>19 mapped deals</strong></div>
    </section>
  );
}

function ListTable() {
  return (
    <div className="customer-lab__table-card">
      <div className="customer-lab__toolbar-stack">
        <div className="customer-lab__toolbar">
          <div className="customer-lab__toolbar-meta">
            <div className="customer-lab__section-eyebrow">Account workspace</div>
            <div className="customer-lab__section-title">Accounts</div>
          </div>
          <div className="customer-lab__toolbar-actions-primary">
            <button className="customer-lab__ghost-button" type="button">Save view</button>
            <button className="customer-lab__ghost-button" type="button">Export</button>
            <button className="customer-lab__primary-button" type="button">Add account</button>
          </div>
        </div>
        <div className="customer-lab__filter-row">
          <div className="customer-lab__input customer-lab__input--search customer-lab__pseudo-control customer-lab__pseudo-control--search">Search account, owner, industry, website</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Health: Healthy + Watch</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Tier: Strategic + Growth</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Sort: Renewal date</div>
          <button className="customer-lab__ghost-button" type="button">Advanced filters</button>
          <button className="customer-lab__icon-button" type="button">Refresh</button>
        </div>
        <div className="customer-lab__filter-summary">
          <div className="customer-lab__preview-actions">
            <span className="customer-lab__selection-note">Portfolio view active</span>
            <span className="customer-lab__filter-chip">North America</span>
            <span className="customer-lab__filter-chip">Renewal this quarter</span>
            <span className="customer-lab__filter-chip">ARR above $100k</span>
          </div>
          <span>14 matching accounts / 4 saved views</span>
        </div>
      </div>
      <div className="customer-lab__table-header customer-lab__account-table-header">
        <span>Account</span><span>Owner</span><span>Health</span><span>ARR</span><span>Renewal</span><span>Open deals</span><span>Contacts</span><span>Actions</span>
      </div>
      <div className="customer-lab__table-body">
        {ACCOUNT_SAMPLE.map((account, index) => (
          <div key={account.id} className="customer-lab__row customer-lab__account-row" data-active={index === 0 ? 'true' : 'false'}>
            <AccountIdentity account={account} />
            <div className="customer-lab__row-contact">
              <strong>{account.owner}</strong>
              <ClampedText title={account.website}>{account.website}</ClampedText>
            </div>
            <div><Pill tone={healthTone[account.health]}>{account.health}</Pill></div>
            <div className="customer-lab__money">{formatCurrency(account.arr)}</div>
            <div>{account.renewal}</div>
            <div>{account.openDeals}</div>
            <div className="customer-lab__inline-stack">
              {account.contacts.slice(0, 2).map((contact) => <ClampedText key={contact} title={contact}>{contact}</ClampedText>)}
              {account.contacts.length > 2 ? <span>+{account.contacts.length - 2}</span> : null}
            </div>
            <div className="customer-lab__row-actions">
              <button aria-label="More account row actions" className="customer-lab__menu-button" type="button">⋯</button>
            </div>
          </div>
        ))}
      </div>
      <div className="customer-lab__table-footer">
        <div className="customer-lab__selection-note">2 selected / assign owner / review renewal / export</div>
        <div className="customer-lab__pagination">Page 1 of 8 / 10 rows</div>
      </div>
    </div>
  );
}

function QuickPreview() {
  return (
    <div className="customer-lab__preview-layer">
      <div className="customer-lab__preview-scrim" />
      <aside className="customer-lab__preview-card customer-lab__preview-card--drawer customer-lab__glass-card">
        <div className="customer-lab__preview-top">
          <div>
            <div className="customer-lab__section-eyebrow">Selected row</div>
            <div className="customer-lab__section-title">Quick preview</div>
          </div>
          <div className="customer-lab__preview-actions">
            <button className="customer-lab__ghost-button" type="button">Create deal</button>
            <button className="customer-lab__primary-button" type="button">Open account</button>
            <button aria-label="More preview actions" className="customer-lab__menu-button" type="button">⋯</button>
          </div>
        </div>
        <div className="customer-lab__preview-stack">
          <AccountIdentity account={primaryRecord} />
          <div className="customer-lab__preview-actions">
            <Pill tone={healthTone[primaryRecord.health]}>{primaryRecord.health}</Pill>
            <Pill tone={tierTone[primaryRecord.tier]}>{primaryRecord.tier}</Pill>
            <span className="customer-lab__status-chip">Drawer preview</span>
          </div>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Primary actions</div>
            <div className="customer-lab__action-grid customer-lab__action-grid--balanced">
              <button className="customer-lab__primary-button" type="button">Edit account</button>
              <button className="customer-lab__ghost-button" type="button">Assign owner</button>
              <button aria-label="More account actions" className="customer-lab__menu-button" type="button">⋯</button>
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Commercial snapshot</div>
            <div className="customer-lab__metric-grid">
              <MetricCard label="Owner" value={primaryRecord.owner} />
              <MetricCard label="ARR" value={formatCurrency(primaryRecord.arr)} />
              <MetricCard label="Renewal" value={primaryRecord.renewal} />
              <MetricCard label="Open deals" value={primaryRecord.openDeals} />
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Account context</div>
            <div className="customer-lab__stack customer-lab__stack--tight">
              <div className="customer-lab__detail-item"><span>Website</span><PlainLink href={`https://${primaryRecord.website}`}>{primaryRecord.website}</PlainLink></div>
              <div className="customer-lab__detail-item"><span>Region</span><strong>{primaryRecord.region}</strong></div>
              <div className="customer-lab__detail-item"><span>Contacts</span><strong>{primaryRecord.contacts.length} active</strong></div>
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Latest note</div>
            <div className="customer-lab__preview-note">
              <ClampedText lines={2} title={primaryRecord.notes}>{primaryRecord.notes}</ClampedText>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function DetailScreen() {
  return (
    <section className="customer-lab__detail-shell">
      <aside className="customer-lab__detail-left">
        <section className="customer-lab__panel customer-lab__panel--sticky">
          <div className="customer-lab__section-eyebrow">Account summary</div>
          <AccountIdentity account={primaryRecord} />
          <div className="customer-lab__summary-pills">
            <Pill tone={healthTone[primaryRecord.health]}>{primaryRecord.health}</Pill>
            <Pill tone={tierTone[primaryRecord.tier]}>{primaryRecord.tier}</Pill>
          </div>
          <p className="customer-lab__panel-caption">Keep ownership, renewal posture, and one next move visible while the account record stays central.</p>
          <div className="customer-lab__action-grid customer-lab__action-grid--balanced">
            <button className="customer-lab__primary-button" type="button">Edit account</button>
            <button className="customer-lab__ghost-button" type="button">Create deal</button>
            <button aria-label="More account actions" className="customer-lab__menu-button" type="button">⋯</button>
          </div>
          <div className="customer-lab__metric-grid">
            <MetricCard label="ARR" value={formatCurrency(primaryRecord.arr)} />
            <MetricCard label="Open deals" value={primaryRecord.openDeals} />
            <MetricCard label="Renewal" value={primaryRecord.renewal} />
            <MetricCard label="Last activity" value={formatDate(primaryRecord.lastActivityAt)} />
          </div>
        </section>

        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Account context</div>
          <div className="customer-lab__panel-list">
            <div className="customer-lab__detail-item"><span>Owner</span><strong>{primaryRecord.owner}</strong></div>
            <div className="customer-lab__detail-item"><span>Website</span><PlainLink href={`https://${primaryRecord.website}`}>{primaryRecord.website}</PlainLink></div>
            <div className="customer-lab__detail-item"><span>Region</span><strong>{primaryRecord.region}</strong></div>
            <div className="customer-lab__detail-item"><span>Employees</span><strong>{primaryRecord.employees}</strong></div>
          </div>
        </section>

        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Renewal posture</div>
          <div className="customer-lab__panel-list">
            <div className="customer-lab__detail-item"><span>Executive path</span><strong>Active sponsor engagement</strong></div>
            <div className="customer-lab__detail-item"><span>Commercial posture</span><strong>Expansion review before renewal</strong></div>
            <div className="customer-lab__detail-item"><span>Watchpoint</span><strong>Security and data residency review</strong></div>
          </div>
        </section>
      </aside>
      <div className="customer-lab__detail-center">
        <section className="customer-lab__panel customer-lab__panel--command">
          <div className="customer-lab__detail-head customer-lab__detail-head--compact">
            <div>
              <div className="customer-lab__section-eyebrow">Account profile</div>
              <div className="customer-lab__section-title customer-lab__section-title--lg">{primaryRecord.name}</div>
            </div>
            <div className="customer-lab__preview-actions">
              <button className="customer-lab__ghost-button" type="button">Delete</button>
              <button className="customer-lab__primary-button" type="button">Edit account</button>
              <button aria-label="More account profile actions" className="customer-lab__menu-button" type="button">⋯</button>
            </div>
          </div>
          <div className="customer-lab__command-strip">
            <div className="customer-lab__command-item"><span>Industry</span><strong>{primaryRecord.industry}</strong></div>
            <div className="customer-lab__command-item"><span>Owner</span><strong>{primaryRecord.owner}</strong></div>
            <div className="customer-lab__command-item"><span>Open deals</span><strong>{primaryRecord.openDeals}</strong></div>
            <div className="customer-lab__command-item"><span>Renewal</span><strong>{primaryRecord.renewal}</strong></div>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Company profile</div>
          <div className="customer-lab__section-title">Company profile</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Account name" value={primaryRecord.name} />
            <FieldCard label="Website" value={<PlainLink href={`https://${primaryRecord.website}`}>{primaryRecord.website}</PlainLink>} />
            <FieldCard label="Industry" value={primaryRecord.industry} />
            <FieldCard label="Region" value={primaryRecord.region} />
            <FieldCard label="Employees" value={primaryRecord.employees} />
            <FieldCard label="Created at" value={formatDate(primaryRecord.createdAt)} />
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Commercial context</div>
          <div className="customer-lab__section-title">Commercial context</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Owner" value={primaryRecord.owner} />
            <FieldCard label="Health" value={<Pill tone={healthTone[primaryRecord.health]}>{primaryRecord.health}</Pill>} />
            <FieldCard label="ARR" value={formatCurrency(primaryRecord.arr)} />
            <FieldCard label="Tier" value={<Pill tone={tierTone[primaryRecord.tier]}>{primaryRecord.tier}</Pill>} />
            <FieldCard label="Renewal" value={primaryRecord.renewal} />
            <FieldCard label="Open deals" value={String(primaryRecord.openDeals)} />
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Renewal plan</div>
          <div className="customer-lab__section-title">Renewal plan</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Primary motion" value="Renewal with platform expansion and security review checkpoint." lines={2} />
            <FieldCard label="Executive sponsor" value="Engaged and reviewing expansion scope in the next QBR." lines={2} />
            <FieldCard label="Procurement posture" value="Central procurement with documented approval path." lines={2} />
            <FieldCard label="Length handling" value="Long notes, stakeholder lists, and custom fields stay clamped until expanded." lines={2} />
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Related contacts</div>
          <div className="customer-lab__section-title">Related contacts</div>
          <div className="customer-lab__stack">
            {primaryRecord.contacts.map((contact) => <div key={contact} className="customer-lab__detail-item"><span>Contact</span><strong>{contact}</strong></div>)}
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Account notes</div>
          <div className="customer-lab__section-title">Executive context</div>
          <div className="customer-lab__notes-card">
            <div className="customer-lab__notes-clamp" title={primaryRecord.notes}>{primaryRecord.notes}</div>
            <button className="customer-lab__text-button" type="button">Show full account note</button>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Open deals</div>
          <div className="customer-lab__section-title">Open deals</div>
          <div className="customer-lab__stack">
            <div className="customer-lab__detail-item"><span>Platform expansion</span><strong>{formatCurrency(180000)}</strong></div>
            <div className="customer-lab__detail-item"><span>Support uplift</span><strong>{formatCurrency(72000)}</strong></div>
            <div className="customer-lab__detail-item"><span>Data residency add-on</span><strong>{formatCurrency(40000)}</strong></div>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Custom fields</div>
          <div className="customer-lab__panel-head">
            <div>
              <div className="customer-lab__section-title">Pinned fields</div>
              <div className="customer-lab__section-subtle">2 groups pinned / 14 total fields / 2 groups collapsed</div>
            </div>
            <div className="customer-lab__preview-actions">
              <button className="customer-lab__ghost-button" type="button">All custom fields (14)</button>
              <button aria-label="More custom field actions" className="customer-lab__menu-button" type="button">⋯</button>
            </div>
          </div>
          <div className="customer-lab__form-grid customer-lab__form-grid--dense">
            {customFields.map((field) => <FieldCard key={field.label} label={field.label} value={field.value} lines={2} />)}
          </div>
        </section>
      </div>
      <aside className="customer-lab__detail-right">
        <section className="customer-lab__panel customer-lab__panel--sticky customer-lab__glass-card">
          <div className="customer-lab__section-eyebrow">Risk signals</div>
          <div className="customer-lab__stack">
            <div className="customer-lab__detail-item"><span>Security review</span><strong>In progress</strong></div>
            <div className="customer-lab__detail-item"><span>Procurement path</span><strong>Documented</strong></div>
            <div className="customer-lab__detail-item"><span>Executive engagement</span><strong>Healthy</strong></div>
            <div className="customer-lab__detail-item"><span>Field density</span><strong>Pinned groups with overflow drawer</strong></div>
          </div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Related accounts</div>
          <div className="customer-lab__compact-card"><AccountIdentity account={secondaryRecord} compact /></div>
          <div className="customer-lab__compact-card"><AccountIdentity account={tertiaryRecord} compact /></div>
          <div className="customer-lab__compact-card"><AccountIdentity account={quaternaryRecord} compact /></div>
        </section>
        <section className="customer-lab__panel">
          <div className="customer-lab__section-eyebrow">Operating checklist</div>
          <div className="customer-lab__stack">
            <div className="customer-lab__detail-item"><span>Renewal memo</span><strong>Due Apr 18</strong></div>
            <div className="customer-lab__detail-item"><span>Champion coverage</span><strong>2 active contacts</strong></div>
            <div className="customer-lab__detail-item"><span>QBR pack</span><strong>Ready for review</strong></div>
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
            <div className="customer-lab__section-title customer-lab__section-title--lg">{isCreate ? 'Create account' : 'Edit account'}</div>
            <p>{isCreate ? 'Capture the company profile, commercial context, and pinned fields before saving.' : 'Review the existing account profile, update the changed fields, and save when the draft is ready.'}</p>
          </div>
          <div className="customer-lab__preview-actions">
            <button className="customer-lab__ghost-button" type="button">Cancel</button>
            <button className="customer-lab__primary-button" type="button">{isCreate ? 'Create account' : 'Save changes'}</button>
          </div>
        </div>
        <div className="customer-lab__drawer-flags">
          <span className="customer-lab__status-chip">Section map</span>
          <span className="customer-lab__status-chip">Company profile</span>
          <span className="customer-lab__status-chip">Commercial context</span>
          <span className="customer-lab__status-chip">Custom fields</span>
        </div>
        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Company profile</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Account name" value={isCreate ? 'Harbor Commerce' : primaryRecord.name} />
            <FieldCard label="Website" value={isCreate ? 'harborcommerce.com' : primaryRecord.website} />
            <FieldCard label="Industry" value={isCreate ? 'Retail logistics' : primaryRecord.industry} />
            <FieldCard label="Region" value={isCreate ? 'North America East' : primaryRecord.region} />
            <FieldCard label="Employees" value={isCreate ? '240 employees' : primaryRecord.employees} />
            <FieldCard label="Notes" value={isCreate ? 'New logo account with high executive visibility and early procurement review.' : primaryRecord.notes} lines={2} />
          </div>
        </section>
        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Commercial context</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Owner" value={isCreate ? 'Ella Brooks' : primaryRecord.owner} />
            <FieldCard label="Health" value={isCreate ? 'watch' : primaryRecord.health} />
            <FieldCard label="Tier" value={isCreate ? 'growth' : primaryRecord.tier} />
            <FieldCard label="ARR" value={isCreate ? '$48,000' : formatCurrency(primaryRecord.arr)} />
            <FieldCard label="Renewal" value={isCreate ? 'Pending first contract' : primaryRecord.renewal} />
            <FieldCard label="Open deals" value={isCreate ? '1' : String(primaryRecord.openDeals)} />
          </div>
        </section>
        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Custom fields</div>
          <div className="customer-lab__form-grid customer-lab__form-grid--dense">
            {customFields.map((field) => <FieldCard key={`${props.mode}-${field.label}`} label={field.label} value={field.value} lines={2} />)}
          </div>
        </section>
      </div>
    </section>
  );
}

function DeleteDialog() {
  return (
    <section className="customer-lab__single-screen">
      <ListTable />
      <div className="customer-lab__modal-backdrop">
        <div className="customer-lab__modal customer-lab__glass-card">
          <div className="customer-lab__section-eyebrow">Atlas workspace</div>
          <div className="customer-lab__section-title customer-lab__section-title--lg">Delete account</div>
          <p>This action removes the account from the active workspace, including <strong>{primaryRecord.name}</strong>, account notes, and commercial context.</p>
          <div className="customer-lab__section-eyebrow">Deletion impact</div>
          <div className="customer-lab__modal-summary">
            <div className="customer-lab__detail-item"><span>Account</span><strong>{primaryRecord.name}</strong></div>
            <div className="customer-lab__detail-item"><span>ARR</span><strong>{formatCurrency(primaryRecord.arr)}</strong></div>
            <div className="customer-lab__detail-item"><span>Open deals</span><strong>{primaryRecord.openDeals}</strong></div>
          </div>
          <div className="customer-lab__modal-actions">
            <button className="customer-lab__text-button" type="button">Export account</button>
            <button className="customer-lab__ghost-button" type="button">Cancel</button>
            <button className="customer-lab__danger-button" type="button">Delete account</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Screen(props: { screen: AccountConceptScreen }) {
  if (props.screen === 'detail') return <DetailScreen />;
  if (props.screen === 'create') return <Drawer mode="create" />;
  if (props.screen === 'edit') return <Drawer mode="edit" />;
  if (props.screen === 'delete') return <DeleteDialog />;
  return (
    <section className="customer-lab__list-stage">
      <ListTable />
      <QuickPreview />
    </section>
  );
}

export function AccountConceptLab(props: { conceptId: AccountConceptId; screen: AccountConceptScreen }) {
  const concept = ACCOUNT_CONCEPTS.find((item) => item.id === props.conceptId) ?? ACCOUNT_CONCEPTS[1];
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
