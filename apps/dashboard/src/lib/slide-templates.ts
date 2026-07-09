// Built-in slide templates. Each renders self-contained, full-screen HTML with
// inline styles so it plays inside the display client's html-slide iframe.
// Picking a template produces a normal `html` slide the operator can further
// edit by hand afterwards.

export type TemplateFieldType = 'text' | 'textarea' | 'color' | 'list';

export interface TemplateField {
  key:     string;
  label:   string;
  type:    TemplateFieldType;
  default: string;
  hint?:   string;
}

export interface SlideTemplate {
  id:          string;
  name:        string;
  description: string;
  fields:      TemplateField[];
  render:      (v: Record<string, string>) => string;
}

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// "Name | 9.50" per line → styled rows. The separator is the last "|" so names
// may contain spaces freely.
function rows(raw: string, render: (left: string, right: string) => string): string {
  return String(raw ?? '').split('\n').map(line => {
    const t = line.trim();
    if (!t) return '';
    const i = t.lastIndexOf('|');
    const left  = i >= 0 ? t.slice(0, i).trim() : t;
    const right = i >= 0 ? t.slice(i + 1).trim() : '';
    return render(esc(left), esc(right));
  }).join('');
}

const shell = (bg: string, body: string) => `<!doctype html><html><head><meta charset="utf8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
body{background:${bg};color:#fff;display:flex;flex-direction:column;justify-content:center;padding:6vmin}
</style></head><body>${body}</body></html>`;

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome screen',
    description: 'A big title and subtitle on a solid background.',
    fields: [
      { key: 'title',    label: 'Title',      type: 'text',  default: 'Welcome' },
      { key: 'subtitle', label: 'Subtitle',   type: 'text',  default: 'We’re glad you’re here' },
      { key: 'bg',       label: 'Background',  type: 'color', default: '#0b1220' },
      { key: 'accent',   label: 'Accent',     type: 'color', default: '#5b8cff' },
    ],
    render: v => shell(v.bg, `
      <div style="max-width:88vw">
        <div style="width:14vmin;height:0.7vmin;background:${esc(v.accent)};border-radius:9px;margin-bottom:4vmin"></div>
        <h1 style="font-size:12vmin;font-weight:800;line-height:1.02;letter-spacing:-0.03em">${esc(v.title)}</h1>
        <p style="font-size:4.5vmin;color:rgba(255,255,255,0.7);margin-top:2.5vmin;font-weight:500">${esc(v.subtitle)}</p>
      </div>`),
  },
  {
    id: 'announcement',
    name: 'Announcement',
    description: 'A heading with a body message and a coloured bar.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text',     default: 'Important notice' },
      { key: 'body',    label: 'Message', type: 'textarea', default: 'Add your announcement text here.' },
      { key: 'bg',      label: 'Background', type: 'color',  default: '#111318' },
      { key: 'accent',  label: 'Accent',    type: 'color',  default: '#fbbf24' },
    ],
    render: v => shell(v.bg, `
      <div style="border-left:1.2vmin solid ${esc(v.accent)};padding-left:5vmin;max-width:86vw">
        <h1 style="font-size:9vmin;font-weight:800;line-height:1.05;letter-spacing:-0.02em">${esc(v.heading)}</h1>
        <p style="font-size:4.2vmin;color:rgba(255,255,255,0.78);margin-top:3vmin;line-height:1.4;white-space:pre-wrap">${esc(v.body)}</p>
      </div>`),
  },
  {
    id: 'menu',
    name: 'Menu board',
    description: 'A title and a list of items with prices.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', default: 'Today’s Menu' },
      { key: 'items', label: 'Items', type: 'list', default: 'Soup of the day | 5.50\nHouse burger | 12.00\nFlat white | 3.20',
        hint: 'One per line — “Name | Price”.' },
      { key: 'bg',     label: 'Background', type: 'color', default: '#141210' },
      { key: 'accent', label: 'Accent',    type: 'color', default: '#f59e0b' },
    ],
    render: v => shell(v.bg, `
      <div style="max-width:86vw;width:100%">
        <h1 style="font-size:8vmin;font-weight:800;color:${esc(v.accent)};letter-spacing:-0.02em;margin-bottom:5vmin">${esc(v.title)}</h1>
        <div style="display:flex;flex-direction:column;gap:3vmin">
          ${rows(v.items, (name, price) => `
            <div style="display:flex;align-items:baseline;gap:2vmin;font-size:4.6vmin">
              <span style="font-weight:600">${name}</span>
              <span style="flex:1;border-bottom:2px dotted rgba(255,255,255,0.2);transform:translateY(-0.8vmin)"></span>
              <span style="font-weight:700;color:${esc(v.accent)}">${price}</span>
            </div>`)}
        </div>
      </div>`),
  },
  {
    id: 'schedule',
    name: 'Event schedule',
    description: 'A title and a list of times with events.',
    fields: [
      { key: 'title',  label: 'Title', type: 'text', default: 'Today’s Schedule' },
      { key: 'events', label: 'Events', type: 'list', default: '09:00 | Doors open\n10:30 | Morning session\n12:00 | Lunch\n14:00 | Afternoon session',
        hint: 'One per line — “Time | Event”.' },
      { key: 'bg',     label: 'Background', type: 'color', default: '#0d1117' },
      { key: 'accent', label: 'Accent',    type: 'color', default: '#34d399' },
    ],
    render: v => shell(v.bg, `
      <div style="max-width:86vw;width:100%">
        <h1 style="font-size:8vmin;font-weight:800;letter-spacing:-0.02em;margin-bottom:5vmin">${esc(v.title)}</h1>
        <div style="display:flex;flex-direction:column;gap:2.6vmin">
          ${rows(v.events, (time, name) => `
            <div style="display:flex;align-items:baseline;gap:3.5vmin;font-size:4.4vmin">
              <span style="font-variant-numeric:tabular-nums;font-weight:700;color:${esc(v.accent)};min-width:6em">${time}</span>
              <span style="font-weight:500">${name}</span>
            </div>`)}
        </div>
      </div>`),
  },
];

export function getTemplate(id: string) {
  return SLIDE_TEMPLATES.find(t => t.id === id) ?? null;
}
