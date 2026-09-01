import { html, css } from 'lit';
import { TransformersBaseCard, baseStyles } from './base-card.js';

class TransformersClockCard extends TransformersBaseCard {
  static get styles() {
    return [
      baseStyles,
      css`
        .clock-display {
          text-align: center;
          padding: 24px;
        }

        .time-display {
          font-size: 3.5em;
          font-weight: bold;
          font-family: var(--transformers-resolved-font-family);
          text-shadow: 0 0 15px var(--transformers-glow-color);
          letter-spacing: 4px;
          margin: 16px 0;
        }

        .date-display {
          font-size: 1.2em;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 12px;
          opacity: 0.9;
        }

        .timezone-display {
          font-size: 0.9em;
          margin-top: 8px;
          opacity: 0.7;
        }

        .time-separator {
          animation: blink 1s infinite;
        }
      `,
    ];
  }

  constructor() {
    super();
    this._time = new Date();
    this._interval = undefined;
    this._minuteTimeout = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    this._time = new Date();
    this._scheduleTick();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTick();
  }

  // `setConfig()` replaces `this.config` wholesale, which is a LitElement
  // reactive property — reschedule whenever it lands, in case show_seconds
  // changed (e.g. the visual editor's live preview).
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('config')) {
      this._scheduleTick();
    }
  }

  _clearTick() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
    if (this._minuteTimeout) {
      clearTimeout(this._minuteTimeout);
      this._minuteTimeout = undefined;
    }
  }

  // `show_seconds` decides how often this card needs to wake up at all. With
  // seconds on, a 1 Hz heartbeat is the point of the card. With them off —
  // the common "just show HH:MM" case, and how this card is configured on
  // the SHOCKWAVE wall panel — a second-by-second wake-up was pure waste:
  // Lit was patching the same unchanged minute back in, 60 times for every
  // one that actually mattered, forever. Wake once a minute instead, aligned
  // to the boundary so the displayed minute still turns over on time rather
  // than up to 59s late.
  _scheduleTick() {
    this._clearTick();
    const showSeconds = this.config?.show_seconds !== false;
    const tick = () => {
      this._time = new Date();
      this.requestUpdate();
    };
    if (showSeconds) {
      this._interval = setInterval(tick, 1000);
      return;
    }
    const now = new Date();
    const msToNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    this._minuteTimeout = setTimeout(() => {
      tick();
      this._interval = setInterval(tick, 60000);
    }, msToNextMinute);
  }

  render() {
    if (!this.config) {
      return html``;
    }

    const title = this.config.title || 'SYSTEM TIME';
    const format24h = this.config.format_24h !== false;
    const showSeconds = this.config.show_seconds !== false;
    const showDate = this.config.show_date !== false;
    const showTimezone = this.config.show_timezone || false;

    const hours = format24h
      ? String(this._time.getHours()).padStart(2, '0')
      : String(this._time.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(this._time.getMinutes()).padStart(2, '0');
    const seconds = String(this._time.getSeconds()).padStart(2, '0');
    const ampm = format24h ? '' : this._time.getHours() >= 12 ? ' PM' : ' AM';
    const dateStr = this._time
      .toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      .toUpperCase();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return html`
      <div class="${this._cardClasses()}">
        <div class="card-content">
          <div class="card-header">${title}</div>
          <div class="clock-display">
            <div class="time-display">
              ${hours}<span class="time-separator">:</span>${minutes}${showSeconds
                ? html`<span class="time-separator">:</span>${seconds}`
                : ''}${ampm}
            </div>
            ${showDate ? html`<div class="date-display">${dateStr}</div>` : ''}
            ${showTimezone ? html`<div class="timezone-display">${timezone}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  static getStubConfig() {
    return {
      type: 'custom:transformers-clock-card',
      title: 'SYSTEM TIME',
      format_24h: true,
      show_seconds: true,
      show_date: true,
      show_timezone: false,
      font_style: 'theme',
    };
  }
}

customElements.define('transformers-clock-card', TransformersClockCard);