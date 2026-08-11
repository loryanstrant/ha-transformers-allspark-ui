/**
 * Transformers Allspark UI — theme shim.
 *
 * Home Assistant sets `body { font-family: Roboto, Noto, sans-serif }` in index.html and
 * every element inside a dashboard simply inherits it. Nothing in the card tree reads
 * `--ha-font-family-body`, so a theme on its own cannot change body text. Card headers are
 * the exception — `ha-card` uses `var(--ha-card-header-font-family, inherit)`, which is why
 * headers follow the theme but the text under them does not.
 *
 * This adopts a single rule into `hui-root`'s shadow root:
 *
 *     hui-view-container { font-family: var(--ha-font-family-body); }
 *
 * Home Assistant already applies theme variables to `hui-view-container`, so a view with
 * `theme:` set picks up that theme's font and everything below inherits it. A view with no
 * theme resolves `--ha-font-family-body` to Home Assistant's own default, so the rule is a
 * no-op there — scoping comes for free from HA's own theme handling.
 *
 * Deliberately depends on no Home Assistant panel, route or internal module. Reaching into
 * the `developer-tools` panel is exactly what broke card-mod in HA 2026.8.
 */

const SHIM_CSS = 'hui-view-container { font-family: var(--ha-font-family-body); }';
const FLAG = '__transformersAllsparkThemeShim';

/** Adopt the rule into a shadow root, once. */
const applyTo = (root) => {
  if (!root || root[FLAG]) return;
  root[FLAG] = true;

  try {
    if ('adoptedStyleSheets' in root && typeof CSSStyleSheet === 'function') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(SHIM_CSS);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    }
  } catch (err) {
    // Constructable stylesheets unavailable or blocked — fall through to <style>.
  }

  const style = document.createElement('style');
  style.textContent = SHIM_CSS;
  root.appendChild(style);
};

/** Catch any hui-root that was already connected before this module loaded. */
const sweep = (root) => {
  for (const el of root.querySelectorAll('*')) {
    if (el.tagName === 'HUI-ROOT') applyTo(el.shadowRoot);
    else if (el.shadowRoot) sweep(el.shadowRoot);
  }
};

customElements.whenDefined('hui-root').then((defined) => {
  const ctor = defined || customElements.get('hui-root');
  const proto = ctor && ctor.prototype;

  // Cover every hui-root created from now on.
  if (proto && !Object.prototype.hasOwnProperty.call(proto, FLAG)) {
    proto[FLAG] = true;
    const original = proto.connectedCallback;
    proto.connectedCallback = function connectedCallback(...args) {
      if (original) original.apply(this, args);
      applyTo(this.shadowRoot);
    };
  }

  sweep(document);
});
