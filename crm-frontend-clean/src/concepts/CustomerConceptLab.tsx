import React from 'react';
import {
  CUSTOMER_CONCEPTS,
  CUSTOMER_SAMPLE,
  CUSTOMER_SCREENS,
  type CustomerConceptId,
  type CustomerConceptRecord,
  type CustomerConceptScreen,
} from './customerConceptContract.js';

const conceptConfig: Record<
  CustomerConceptId,
  {
    eyebrow: string;
    accent: string;
    shellLabel: string;
    densityLabel: string;
    heroStat: string;
    heroLabel: string;
    sidebarItems: string[];
    railLabel: string;
  }
> = {
  meridian: {
    eyebrow: 'SMB self-serve',
    accent: 'Warm product-led onboarding with visible next steps.',
    shellLabel: 'Customer HQ',
    densityLabel: 'Guided workspace',
    heroStat: '89% setup completion',
    heroLabel: 'Playbooks adopted this month',
    sidebarItems: ['Customers', 'Inbox', 'Playbooks', 'Segments', 'Settings'],
    railLabel: 'Customer operations',
  },
  atlas: {
    eyebrow: 'Mid-market sales-led',
    accent: 'Executive polish, fast handoff, and strong relationship context.',
    shellLabel: 'Revenue workspace',
    densityLabel: 'Balanced insight density',
    heroStat: '$2.8M weighted pipeline',
    heroLabel: 'Owned by customer success',
    sidebarItems: ['Customers', 'Accounts', 'Pipeline', 'Activities', 'Reports'],
    railLabel: 'Revenue operations',
  },
  foundry: {
    eyebrow: 'Enterprise ops-heavy',
    accent: 'Operational rigor, denser tables, and clear workflow checkpoints.',
    shellLabel: 'Operations control',
    densityLabel: 'High-density operational view',
    heroStat: '17 active workflows',
    heroLabel: 'Running across regions',
    sidebarItems: ['Customers', 'Queues', 'Approvals', 'Health', 'Governance'],
    railLabel: 'Control operations',
  },
};

const screenTitles: Record<CustomerConceptScreen, string> = {
  list: 'Customer list with quick preview',
  detail: 'Full customer profile',
  create: 'Create customer',
  edit: 'Edit customer',
  delete: 'Delete confirmation',
};

function getPageTitle(screen: CustomerConceptScreen) {
  if (screen === 'detail') return primaryRecord.name;
  if (screen === 'create') return 'Create customer';
  if (screen === 'edit') return 'Edit customer';
  if (screen === 'delete') return 'Delete customer';
  return 'Customers';
}

const statusTone: Record<CustomerConceptRecord['status'], string> = {
  active: 'positive',
  pending: 'caution',
  inactive: 'neutral',
};

const levelTone: Record<CustomerConceptRecord['level'], string> = {
  vip: 'premium',
  normal: 'steady',
  potential: 'growth',
};

const basePrimaryRecord = CUSTOMER_SAMPLE[0];
const primaryRecord: CustomerConceptRecord = {
  ...basePrimaryRecord,
  company: `${basePrimaryRecord.company} Strategic Revenue Systems`,
  address: `${basePrimaryRecord.address}, United States`,
  notes: `${basePrimaryRecord.notes} Renewal and onboarding stakeholders also requested a documented launch checklist before the next executive review and a custom implementation status matrix for procurement stakeholders.`,
};

const records: CustomerConceptRecord[] = [primaryRecord, ...CUSTOMER_SAMPLE.slice(1)];
const secondaryRecord = records[1] ?? primaryRecord;
const tertiaryRecord = records[3] ?? primaryRecord;

const customFields = [
  { label: 'Region cluster', value: 'North America / West Enterprise Corridor' },
  { label: 'Implementation owner', value: 'Sofia Nguyen' },
  { label: 'Expansion score', value: '82 / 100' },
  { label: 'Procurement path', value: 'Legal and finance approval required before seat expansion' },
  { label: 'ERP connector', value: 'NetSuite custom mapping enabled' },
  { label: 'Internal segment', value: 'Strategic / multi-stakeholder / renewal watch' },
] as const;

const fieldGroups = ['Identity', 'Commercial context', 'System fields', 'Notes', 'Custom fields'] as const;

function isConcept(value: string | null): value is CustomerConceptId {
  return CUSTOMER_CONCEPTS.some((item) => item.id === value);
}

function isScreen(value: string | null): value is CustomerConceptScreen {
  return CUSTOMER_SCREENS.some((item) => item === value);
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

function visibleTags(tags: readonly string[], limit = 2) {
  return {
    tags: tags.slice(0, limit),
    overflow: Math.max(tags.length - limit, 0),
  };
}

export function getConceptFromSearch(search: string): {
  conceptId: CustomerConceptId;
  screen: CustomerConceptScreen;
} {
  const params = new URLSearchParams(search);
  const conceptParam = params.get('concept');
  const screenParam = params.get('screen');

  return {
    conceptId: isConcept(conceptParam) ? conceptParam : 'atlas',
    screen: isScreen(screenParam) ? screenParam : 'list',
  };
}

function ClampedText(props: {
  children: React.ReactNode;
  title?: string;
  lines?: 1 | 2;
  className?: string;
}) {
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

function LinkValue(props: { href: string; children: React.ReactNode }) {
  return (
    <a className="customer-lab__meta-link" href={props.href}>
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

function TagList(props: { tags: readonly string[]; limit?: number }) {
  const { tags, overflow } = visibleTags(props.tags, props.limit ?? 3);

  return (
    <div className="customer-lab__tag-list">
      {tags.map((tag) => (
        <span key={tag} className="customer-lab__tag" title={tag}>
          {tag}
        </span>
      ))}
      {overflow > 0 ? <span className="customer-lab__tag">+{overflow}</span> : null}
    </div>
  );
}

function Identity(props: {
  customer: CustomerConceptRecord;
  subtitle?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`customer-lab__identity${props.compact ? ' customer-lab__identity--compact' : ''}`}>
      <div className="customer-lab__avatar">{getInitials(props.customer.name)}</div>
      <div className="customer-lab__identity-copy">
        <div className="customer-lab__identity-name" title={props.customer.name}>
          {props.customer.name}
        </div>
        <ClampedText lines={2} title={`${props.customer.company} / ${props.customer.email}`}>
          {props.subtitle ?? `${props.customer.company} / ${props.customer.email}`}
        </ClampedText>
      </div>
    </div>
  );
}

function Sidebar(props: { conceptId: CustomerConceptId; conceptName: string }) {
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
          <button
            key={item}
            className="customer-lab__nav-item"
            data-active={index === 0 ? 'true' : 'false'}
            type="button"
          >
            <span className="customer-lab__nav-dot" />
            <span>{item}</span>
          </button>
        ))}
      </nav>

      <div className="customer-lab__sidebar-card">
        <div className="customer-lab__section-eyebrow">{config.railLabel}</div>
        <div className="customer-lab__sidebar-headline">{config.heroStat}</div>
        <p>{config.accent}</p>
      </div>
    </aside>
  );
}

function TopBar(props: {
  conceptId: CustomerConceptId;
  screen: CustomerConceptScreen;
  title: string;
}) {
  return (
    <header className="customer-lab__topbar">
      <div>
        <div className="customer-lab__context-label">{props.conceptId === 'atlas' ? 'Atlas workspace' : 'Workspace'}</div>
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

function CompactStrip(props: { conceptId: CustomerConceptId }) {
  const config = conceptConfig[props.conceptId];

  return (
    <section className="customer-lab__compact-strip">
      <div className="customer-lab__compact-stat customer-lab__compact-stat--primary">
        <span>Portfolio signal</span>
        <strong>{config.heroStat}</strong>
      </div>
      <div className="customer-lab__compact-stat">
        <span>Follow-up due</span>
        <strong>9 customers</strong>
      </div>
      <div className="customer-lab__compact-stat">
        <span>Combined filters</span>
        <strong>Status + level + tags</strong>
      </div>
      <div className="customer-lab__compact-stat">
        <span>Custom field groups</span>
        <strong>6 active / 18 fields</strong>
      </div>
    </section>
  );
}

function ListActions() {
  return (
    <div className="customer-lab__row-actions">
      <button aria-label="More customer row actions" className="customer-lab__menu-button" type="button">
        ⋯
      </button>
    </div>
  );
}

function BulkActionBar() {
  return (
    <div className="customer-lab__bulk-bar">
      <div className="customer-lab__bulk-summary">
        <span className="customer-lab__section-eyebrow">Selection</span>
        <strong>3 customers selected</strong>
      </div>
      <div className="customer-lab__bulk-actions">
        <button className="customer-lab__ghost-button" type="button">
          Bulk assign
        </button>
        <button className="customer-lab__ghost-button" type="button">
          Bulk tag
        </button>
        <button className="customer-lab__primary-button" type="button">
          Bulk export
        </button>
      </div>
    </div>
  );
}

function ListTable() {
  return (
    <div className="customer-lab__table-card">
      <div className="customer-lab__toolbar-stack">
        <div className="customer-lab__toolbar">
          <div className="customer-lab__toolbar-meta">
            <div className="customer-lab__section-eyebrow">Customer workspace</div>
            <div className="customer-lab__section-title">Customers</div>
          </div>
          <div className="customer-lab__toolbar-actions-primary">
            <button className="customer-lab__ghost-button" type="button">
              Save view
            </button>
            <button className="customer-lab__ghost-button" type="button">
              Export
            </button>
            <button className="customer-lab__primary-button" type="button">
              Add customer
            </button>
          </div>
        </div>

        <div className="customer-lab__filter-row">
          <div className="customer-lab__input customer-lab__input--search customer-lab__pseudo-control customer-lab__pseudo-control--search">
            Search name, company, email, phone
          </div>
          <div className="customer-lab__select customer-lab__pseudo-control">Status: Active + Pending</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Level: VIP + Potential</div>
          <div className="customer-lab__select customer-lab__pseudo-control">Sort: Last contact</div>
          <button className="customer-lab__ghost-button" type="button">
            Advanced filters
          </button>
          <button className="customer-lab__icon-button" type="button">
            Refresh
          </button>
        </div>

        <div className="customer-lab__filter-summary">
          <div className="customer-lab__preview-actions">
            <span className="customer-lab__selection-note">Combined search active</span>
            <span className="customer-lab__filter-chip">West region</span>
            <span className="customer-lab__filter-chip">Strategic</span>
            <span className="customer-lab__filter-chip">Needs follow-up</span>
          </div>
          <span>31 matching customers / 6 saved views</span>
        </div>
      </div>

      <div className="customer-lab__table-header">
        <span>Name</span>
        <span>Contact</span>
        <span>Status</span>
        <span>Level</span>
        <span>Tags</span>
        <span>Created</span>
        <span>Balance</span>
        <span>Actions</span>
      </div>

      <div className="customer-lab__table-body">
        {records.map((customer, index) => (
          <div key={customer.id} className="customer-lab__row" data-active={index === 0 ? 'true' : 'false'}>
            <Identity customer={customer} />
            <div className="customer-lab__row-contact">
              <LinkValue href={`mailto:${customer.email}`}>{customer.email}</LinkValue>
              <LinkValue href={`tel:${customer.phone}`}>{customer.phone}</LinkValue>
              <ClampedText title={customer.address}>{customer.address}</ClampedText>
            </div>
            <div>
              <Pill tone={statusTone[customer.status]}>{customer.status}</Pill>
            </div>
            <div>
              <Pill tone={levelTone[customer.level]}>{customer.level}</Pill>
            </div>
            <TagList tags={customer.tags} limit={2} />
            <div>{formatDate(customer.createdAt)}</div>
            <div className="customer-lab__money">{formatCurrency(customer.balance)}</div>
            <ListActions />
          </div>
        ))}
      </div>

      <BulkActionBar />

      <div className="customer-lab__table-footer">
        <div className="customer-lab__selection-note">3 selected / bulk edit / assign owner / export</div>
        <div className="customer-lab__pagination">Page 1 of 24 / 10 rows</div>
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
          <button className="customer-lab__ghost-button" type="button">
            Log activity
          </button>
          <button className="customer-lab__primary-button" type="button">
            Open profile
          </button>
          <button aria-label="More preview actions" className="customer-lab__menu-button" type="button">
            ⋯
          </button>
        </div>
        </div>

        <div className="customer-lab__preview-stack">
          <Identity customer={primaryRecord} subtitle={primaryRecord.company} />

          <div className="customer-lab__preview-actions">
            <Pill tone={statusTone[primaryRecord.status]}>{primaryRecord.status}</Pill>
            <Pill tone={levelTone[primaryRecord.level]}>{primaryRecord.level}</Pill>
            <span className="customer-lab__status-chip">Drawer preview</span>
          </div>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Primary actions</div>
            <div className="customer-lab__action-grid customer-lab__action-grid--balanced">
              <button className="customer-lab__primary-button" type="button">
                Edit customer
              </button>
              <button className="customer-lab__ghost-button" type="button">
                Create task
              </button>
              <button aria-label="More customer actions" className="customer-lab__menu-button" type="button">
                ⋯
              </button>
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Contact lines</div>
            <div className="customer-lab__stack customer-lab__stack--tight">
              <div className="customer-lab__detail-item">
                <span>Email</span>
                <LinkValue href={`mailto:${primaryRecord.email}`}>{primaryRecord.email}</LinkValue>
              </div>
              <div className="customer-lab__detail-item">
                <span>Tel</span>
                <LinkValue href={`tel:${primaryRecord.phone}`}>{primaryRecord.phone}</LinkValue>
              </div>
              <div className="customer-lab__detail-item">
                <span>Company</span>
                <strong>{primaryRecord.company}</strong>
              </div>
              <div className="customer-lab__detail-item customer-lab__detail-item--block">
                <span>Address</span>
                <ClampedText lines={2} title={primaryRecord.address}>
                  {primaryRecord.address}
                </ClampedText>
              </div>
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Relationship snapshot</div>
            <div className="customer-lab__metric-grid">
              <div className="customer-lab__metric-card">
                <span>Balance</span>
                <strong>{formatCurrency(primaryRecord.balance)}</strong>
              </div>
              <div className="customer-lab__metric-card">
                <span>Last contact</span>
                <strong>{formatDate(primaryRecord.lastContactAt)}</strong>
              </div>
              <div className="customer-lab__metric-card">
                <span>Tags</span>
                <strong>{primaryRecord.tags.length} active</strong>
              </div>
              <div className="customer-lab__metric-card">
                <span>Custom groups</span>
                <strong>6 configured</strong>
              </div>
            </div>
          </section>

          <section className="customer-lab__preview-section">
            <div className="customer-lab__section-eyebrow">Latest note</div>
            <div className="customer-lab__preview-note">
              <ClampedText lines={2} title={primaryRecord.notes}>
                {primaryRecord.notes}
              </ClampedText>
            </div>
          </section>
        </div>
      </aside>
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

function FieldCard(props: {
  label: string;
  value: React.ReactNode;
  title?: string;
  lines?: 1 | 2;
}) {
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

function DetailSummaryRail() {
  return (
    <aside className="customer-lab__detail-left">
      <section className="customer-lab__panel customer-lab__panel--sticky">
        <div className="customer-lab__section-eyebrow">Customer summary</div>
        <Identity customer={primaryRecord} subtitle={primaryRecord.company} />

        <div className="customer-lab__summary-pills">
          <Pill tone={statusTone[primaryRecord.status]}>{primaryRecord.status}</Pill>
          <Pill tone={levelTone[primaryRecord.level]}>{primaryRecord.level}</Pill>
          <Pill tone={primaryRecord.starred ? 'premium' : 'neutral'}>
            {primaryRecord.starred ? 'starred' : 'not starred'}
          </Pill>
        </div>

        <p className="customer-lab__panel-caption">Keep identity, status, and one next move visible while the main record stays centered.</p>

        <div className="customer-lab__action-grid customer-lab__action-grid--balanced">
          <button className="customer-lab__primary-button" type="button">
            Edit customer
          </button>
          <button className="customer-lab__ghost-button" type="button">
            Log activity
          </button>
          <button aria-label="More customer actions" className="customer-lab__menu-button" type="button">
            ⋯
          </button>
        </div>

        <div className="customer-lab__metric-grid">
          <MetricCard label="Balance" value={formatCurrency(primaryRecord.balance)} />
          <MetricCard label="Last contact" value={formatDate(primaryRecord.lastContactAt)} />
          <MetricCard label="Created" value={formatDate(primaryRecord.createdAt)} />
          <MetricCard label="Starred" value={primaryRecord.starred ? 'Enabled' : 'Disabled'} />
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Contact lines</div>
        <div className="customer-lab__panel-list">
          <div className="customer-lab__detail-item">
            <span>Email</span>
            <LinkValue href={`mailto:${primaryRecord.email}`}>{primaryRecord.email}</LinkValue>
          </div>
          <div className="customer-lab__detail-item">
            <span>Tel</span>
            <LinkValue href={`tel:${primaryRecord.phone}`}>{primaryRecord.phone}</LinkValue>
          </div>
          <div className="customer-lab__detail-item">
            <span>Company</span>
            <strong>{primaryRecord.company}</strong>
          </div>
          <div className="customer-lab__detail-item customer-lab__detail-item--block">
            <span>Address</span>
            <ClampedText lines={2} title={primaryRecord.address}>
              {primaryRecord.address}
            </ClampedText>
          </div>
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Customer posture</div>
        <div className="customer-lab__panel-list">
          <div className="customer-lab__detail-item customer-lab__detail-item--block">
            <span>Tags</span>
            <TagList tags={primaryRecord.tags} limit={3} />
          </div>
          <div className="customer-lab__detail-item">
            <span>Relationship path</span>
            <strong>Success review to renewal prep</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Next recommended move</span>
            <strong>Share implementation checklist</strong>
          </div>
        </div>
      </section>
    </aside>
  );
}

function FieldGroupNav() {
  return (
    <section className="customer-lab__panel">
      <div className="customer-lab__section-eyebrow">Field groups</div>
      <div className="customer-lab__field-group-list">
        {fieldGroups.map((group, index) => (
          <button
            key={group}
            className="customer-lab__field-group-pill"
            data-active={index === 0 ? 'true' : 'false'}
            type="button"
          >
            {group}
          </button>
        ))}
      </div>
    </section>
  );
}

function DetailCommandStrip() {
  return (
    <section className="customer-lab__panel customer-lab__panel--command">
      <div className="customer-lab__detail-head customer-lab__detail-head--compact">
        <div>
          <div className="customer-lab__section-eyebrow">Profile</div>
          <div className="customer-lab__section-title customer-lab__section-title--lg">{primaryRecord.name}</div>
        </div>
        <div className="customer-lab__preview-actions">
          <button className="customer-lab__ghost-button" type="button">
            Delete
          </button>
          <button className="customer-lab__primary-button" type="button">
            Edit customer
          </button>
          <button aria-label="More profile actions" className="customer-lab__menu-button" type="button">
            ⋯
          </button>
        </div>
      </div>

      <div className="customer-lab__command-strip">
        <div className="customer-lab__command-item">
          <span>Company</span>
          <strong title={primaryRecord.company}>{primaryRecord.company}</strong>
        </div>
        <div className="customer-lab__command-item">
          <span>Status</span>
          <strong>{primaryRecord.status}</strong>
        </div>
        <div className="customer-lab__command-item">
          <span>Balance</span>
          <strong>{formatCurrency(primaryRecord.balance)}</strong>
        </div>
        <div className="customer-lab__command-item">
          <span>Last contact</span>
          <strong>{formatDate(primaryRecord.lastContactAt)}</strong>
        </div>
      </div>
    </section>
  );
}

function DetailCoreColumn() {
  return (
    <div className="customer-lab__detail-center">
      <DetailCommandStrip />
      <FieldGroupNav />

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Core details</div>
        <div className="customer-lab__section-title">Identity</div>
        <div className="customer-lab__form-grid">
          <FieldCard label="Name" value={primaryRecord.name} />
          <FieldCard label="Company" value={primaryRecord.company} lines={2} />
          <FieldCard label="Email" value={<LinkValue href={`mailto:${primaryRecord.email}`}>{primaryRecord.email}</LinkValue>} />
          <FieldCard label="Tel" value={<LinkValue href={`tel:${primaryRecord.phone}`}>{primaryRecord.phone}</LinkValue>} />
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Commercial context</div>
        <div className="customer-lab__section-title">Commercial context</div>
        <div className="customer-lab__form-grid">
          <FieldCard label="Address" value={primaryRecord.address} lines={2} />
          <FieldCard label="Status" value={primaryRecord.status} />
          <FieldCard label="Level" value={primaryRecord.level} />
          <FieldCard label="Tags" value={<TagList tags={primaryRecord.tags} limit={3} />} />
          <FieldCard label="Balance" value={formatCurrency(primaryRecord.balance)} />
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Engagement cockpit</div>
        <div className="customer-lab__section-title">Follow-up and relationship plan</div>
        <div className="customer-lab__form-grid">
          <FieldCard label="Next best action" value="Send implementation checklist and confirm stakeholder sign-off." lines={2} />
          <FieldCard label="Primary concern" value="Procurement needs a documented launch matrix before renewal review." lines={2} />
          <FieldCard label="Working motion" value="Quarterly success review with renewal prep and expansion validation." lines={2} />
          <FieldCard label="Overflow handling" value="Long notes, addresses, and custom values stay clamped until expanded." lines={2} />
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">System fields</div>
        <div className="customer-lab__section-title">System fields</div>
        <div className="customer-lab__form-grid">
          <FieldCard label="Avatar" value="Initials badge" />
          <FieldCard label="Created at" value={formatDate(primaryRecord.createdAt)} />
          <FieldCard label="Last contact at" value={formatDate(primaryRecord.lastContactAt)} />
          <FieldCard label="Starred" value={primaryRecord.starred ? 'Enabled' : 'Disabled'} />
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Notes</div>
        <div className="customer-lab__section-title">Long-form customer context</div>
        <div className="customer-lab__notes-card">
          <div className="customer-lab__notes-clamp" title={primaryRecord.notes}>
            {primaryRecord.notes}
          </div>
          <button className="customer-lab__text-button" type="button">
            Show full customer note
          </button>
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Activity timeline</div>
        <div className="customer-lab__timeline">
          <div className="customer-lab__timeline-item">
            <strong>Mar 28 / Success review</strong>
            <span>Confirmed renewal scope, executive sponsor attendance, and launch dependencies.</span>
          </div>
          <div className="customer-lab__timeline-item">
            <strong>Mar 15 / Expansion workshop</strong>
            <span>Ops and finance teams requested a documented integration readiness review.</span>
          </div>
          <div className="customer-lab__timeline-item">
            <strong>Feb 21 / Product sync</strong>
            <span>Shared API roadmap and pricing envelope for additional seats and support tiers.</span>
          </div>
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Custom fields</div>
        <div className="customer-lab__panel-head">
          <div>
            <div className="customer-lab__section-title">Pinned fields</div>
            <div className="customer-lab__section-subtle">2 groups pinned / 18 total fields / 3 groups collapsed by default</div>
          </div>
          <div className="customer-lab__preview-actions">
            <button className="customer-lab__ghost-button" type="button">
              All custom fields (18)
            </button>
            <button aria-label="More custom field actions" className="customer-lab__menu-button" type="button">
              ⋯
            </button>
          </div>
        </div>
        <div className="customer-lab__form-grid customer-lab__form-grid--dense">
          {customFields.slice(0, 4).map((field) => (
            <FieldCard key={field.label} label={field.label} value={field.value} lines={2} />
          ))}
        </div>
        <button className="customer-lab__text-button customer-lab__text-button--top" type="button">
          Show all custom fields
        </button>
      </section>
    </div>
  );
}

function DetailOperationsRail() {
  return (
    <aside className="customer-lab__detail-right">
      <section className="customer-lab__panel customer-lab__panel--sticky customer-lab__glass-card">
        <div className="customer-lab__section-eyebrow">Operations rail</div>
        <div className="customer-lab__stack">
          <div className="customer-lab__detail-item">
            <span>Primary CTA</span>
            <strong>Edit customer</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Task creation</span>
            <strong>Ready from left rail</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Activity log</span>
            <strong>Call, email, note</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Create flow</span>
            <strong>Drawer based</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Delete flow</span>
            <strong>Confirmation modal</strong>
          </div>
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Data coverage</div>
        <div className="customer-lab__stack">
          <div className="customer-lab__detail-item">
            <span>Required fields</span>
            <strong>14 / 14 complete</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Custom groups</span>
            <strong>2 pinned / 6 active</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Long values</span>
            <strong>Collapsed with reveal</strong>
          </div>
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Related customers</div>
        <div className="customer-lab__compact-card">
          <Identity customer={secondaryRecord} compact />
        </div>
        <div className="customer-lab__compact-card">
          <Identity customer={tertiaryRecord} compact />
        </div>
      </section>

      <section className="customer-lab__panel">
        <div className="customer-lab__section-eyebrow">Workflow checkpoints</div>
        <div className="customer-lab__stack">
          <div className="customer-lab__detail-item">
            <span>Renewal memo</span>
            <strong>Due Apr 12</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Legal review</span>
            <strong>In progress</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Executive QBR</span>
            <strong>Scheduled</strong>
          </div>
          <div className="customer-lab__detail-item">
            <span>Custom field audit</span>
            <strong>3 groups collapsed</strong>
          </div>
        </div>
      </section>
    </aside>
  );
}

function DetailScreen() {
  return (
    <section className="customer-lab__detail-shell">
      <DetailSummaryRail />
      <DetailCoreColumn />
      <DetailOperationsRail />
    </section>
  );
}

function Drawer(props: { mode: 'create' | 'edit' }) {
  const isCreate = props.mode === 'create';
  const tags = isCreate ? ['Pilot', 'New logo', 'Retail'] : primaryRecord.tags;

  return (
    <section className="customer-lab__single-screen">
      <div className="customer-lab__drawer customer-lab__glass-card">
        <div className="customer-lab__drawer-head">
          <div>
            <div className="customer-lab__section-eyebrow">Atlas workspace</div>
            <div className="customer-lab__section-title customer-lab__section-title--lg">
              {isCreate ? 'Create customer' : 'Edit customer'}
            </div>
            <p>{isCreate ? 'Add the primary record, commercial context, and custom fields before saving.' : 'Review the existing record, update the changed fields, and save when the draft is ready.'}</p>
          </div>
          <div className="customer-lab__preview-actions">
            <button className="customer-lab__ghost-button" type="button">
              Cancel
            </button>
            <button className="customer-lab__primary-button" type="button">
              {isCreate ? 'Create customer' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="customer-lab__drawer-flags">
          <span className="customer-lab__status-chip">Section map</span>
          <span className="customer-lab__status-chip">Primary record</span>
          <span className="customer-lab__status-chip">Commercial context</span>
          <span className="customer-lab__status-chip">System fields</span>
          <span className="customer-lab__status-chip">Custom fields</span>
          {isCreate ? <span className="customer-lab__status-chip">Generated on save</span> : null}
          {!isCreate ? <span className="customer-lab__status-chip">Unsaved changes</span> : null}
          {!isCreate ? <span className="customer-lab__status-chip">Review before save</span> : null}
        </div>

        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Primary record</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Name" value={isCreate ? 'Mason Hart' : primaryRecord.name} />
            <FieldCard label="Company" value={isCreate ? 'Harbor Commerce' : primaryRecord.company} lines={2} />
            <FieldCard label="Email" value={<LinkValue href={`mailto:${isCreate ? 'mason@harborcommerce.com' : primaryRecord.email}`}>{isCreate ? 'mason@harborcommerce.com' : primaryRecord.email}</LinkValue>} />
            <FieldCard label="Tel" value={<LinkValue href={`tel:${isCreate ? '+1 (617) 555-0117' : primaryRecord.phone}`}>{isCreate ? '+1 (617) 555-0117' : primaryRecord.phone}</LinkValue>} />
            <FieldCard label="Address" value={isCreate ? '88 Congress St, Boston, MA' : primaryRecord.address} lines={2} />
            <FieldCard label="Notes" value={
              <div className="customer-lab__drawer-notes">
                <div
                  className="customer-lab__notes-clamp"
                  title={
                    isCreate
                      ? 'Needs legal review before procurement and prefers weekly implementation updates.'
                      : primaryRecord.notes
                  }
                >
                  {isCreate
                    ? 'Needs legal review before procurement and prefers weekly implementation updates.'
                    : primaryRecord.notes}
                </div>
                <button className="customer-lab__text-button" type="button">
                  Show full customer note
                </button>
              </div>
            } />
          </div>
        </section>

        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">Commercial context</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Status" value={isCreate ? 'pending' : primaryRecord.status} />
            <FieldCard label="Level" value={isCreate ? 'potential' : primaryRecord.level} />
            <FieldCard label="Tags" value={<TagList tags={tags} limit={3} />} />
            <FieldCard label="Balance" value={isCreate ? '$0' : formatCurrency(primaryRecord.balance)} />
          </div>
        </section>

        <section className="customer-lab__drawer-section">
          <div className="customer-lab__section-eyebrow">System fields</div>
          <div className="customer-lab__form-grid">
            <FieldCard label="Avatar" value={isCreate ? 'Generated initials placeholder' : 'Customer initials badge'} />
            <FieldCard label="Created at" value={isCreate ? 'Generated on save' : formatDate(primaryRecord.createdAt)} />
            <FieldCard label="Last contact at" value={isCreate ? 'Empty until first touchpoint' : formatDate(primaryRecord.lastContactAt)} />
            <FieldCard label="Starred" value={isCreate ? 'Off by default' : primaryRecord.starred ? 'Enabled' : 'Disabled'} />
          </div>
        </section>

        <section className="customer-lab__drawer-section">
          <div className="customer-lab__panel-head">
            <div>
              <div className="customer-lab__section-eyebrow">Custom fields</div>
              <div className="customer-lab__section-subtle">Visible in create and edit workflows</div>
            </div>
            <button className="customer-lab__ghost-button" type="button">
              All custom fields (18)
            </button>
          </div>
          <div className="customer-lab__form-grid customer-lab__form-grid--dense">
            {customFields.slice(0, 4).map((field) => (
              <FieldCard key={`${props.mode}-${field.label}`} label={field.label} value={field.value} lines={2} />
            ))}
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
          <div className="customer-lab__section-title customer-lab__section-title--lg">Delete customer</div>
          <p>This action removes the record from the active workspace, including <strong>{primaryRecord.name}</strong>, tags, notes, balance, and relationship history.</p>
          <div className="customer-lab__section-eyebrow">Deletion impact</div>
          <div className="customer-lab__modal-summary">
            <div className="customer-lab__detail-item">
              <span>Customer</span>
              <strong>{primaryRecord.name}</strong>
            </div>
            <div className="customer-lab__detail-item">
              <span>Company</span>
              <strong>{primaryRecord.company}</strong>
            </div>
            <div className="customer-lab__detail-item">
              <span>Outstanding balance</span>
              <strong>{formatCurrency(primaryRecord.balance)}</strong>
            </div>
          </div>
          <div className="customer-lab__modal-actions">
            <button className="customer-lab__text-button" type="button">
              Export record
            </button>
            <button className="customer-lab__ghost-button" type="button">
              Cancel
            </button>
            <button className="customer-lab__danger-button" type="button">
              Delete customer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Screen(props: { screen: CustomerConceptScreen }) {
  if (props.screen === 'detail') {
    return <DetailScreen />;
  }

  if (props.screen === 'create') {
    return <Drawer mode="create" />;
  }

  if (props.screen === 'edit') {
    return <Drawer mode="edit" />;
  }

  if (props.screen === 'delete') {
    return <DeleteDialog />;
  }

  return (
    <section className="customer-lab__list-stage">
      <ListTable />
      <QuickPreview />
    </section>
  );
}

export function CustomerConceptLab(props: {
  conceptId: CustomerConceptId;
  screen: CustomerConceptScreen;
}) {
  const concept = CUSTOMER_CONCEPTS.find((item) => item.id === props.conceptId) ?? CUSTOMER_CONCEPTS[1];
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
