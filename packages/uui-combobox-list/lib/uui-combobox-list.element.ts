import { defineElement } from '@umbraco-ui/uui-base/lib/registration';
import { css, html, LitElement } from 'lit';
import { property, queryAssignedElements, state } from 'lit/decorators.js';
import { UUISelectableEvent } from '@umbraco-ui/uui-base/lib/events';
import { UUIComboboxListOptionElement } from './uui-combobox-list-option.element';
import { UUIComboboxListEvent } from './UUIComboboxListEvent';

/**
 * @element uui-combobox-list
 * @fires {UUIComboboxListEvent} change - fires when selection is changed
 * @slot default - for uui-combobox-list-options
 * @description - A list that uses uui-combobox-list-options and handles keyboard navigation and selection.
 */
@defineElement('uui-combobox-list')
export class UUIComboboxListElement extends LitElement {
  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
    `,
  ];

  /**
   * Value of selected option.
   * @type { FormDataEntryValue | FormData }
   * @attr
   * @default ""
   */
  @property()
  public get value() {
    return this._value;
  }
  public set value(newValue) {
    if (this._value === newValue) return;

    const oldValue = this._value;
    this._value = newValue;

    this._updateSelection();
    this.requestUpdate('value', oldValue);
  }

  /**
   * A readable value to display to show the selected value.
   * @type { string }
   * @attr
   * @default ""
   */
  @property({ type: String })
  public displayValue = '';

  private _for?: HTMLElement;
  /**
   * provide another element of which keyboard navigation
   * @type { HTMLElement }
   * @attr
   * @default this
   */
  @property({ attribute: false })
  public get for() {
    return this._for;
  }
  public set for(newValue: HTMLElement | undefined) {
    if (this._for) {
      this._for.removeEventListener('keydown', this._onKeyDown);
    }

    this._for = newValue;
    if (this._for) {
      this._for.addEventListener('keydown', this._onKeyDown);
    }
  }

  @queryAssignedElements({
    flatten: true,
    selector: 'uui-combobox-list-option:not([disabled])',
  })
  private _options!: UUIComboboxListOptionElement[];

  @queryAssignedElements({
    flatten: true,
    selector: 'uui-combobox-list-option[active]',
  })
  private _activeOptions!: UUIComboboxListOptionElement[];

  @state()
  private _value: FormDataEntryValue | FormData = '';

  private __activeElement: UUIComboboxListOptionElement | undefined;
  private get _activeElement(): UUIComboboxListOptionElement | undefined {
    return this.__activeElement;
  }
  private set _activeElement(el: UUIComboboxListOptionElement | undefined) {
    if (this.__activeElement) {
      this.__activeElement.active = false;
    }
    if (el) {
      el.active = true;
      this.__activeElement = el;
    }
  }

  private _selectedElement: UUIComboboxListOptionElement | undefined;

  connectedCallback(): void {
    super.connectedCallback();

    if (!this._for) {
      this._for = this;
    }

    this.addEventListener(UUISelectableEvent.SELECTED, this._onSelected);
    this.addEventListener(UUISelectableEvent.UNSELECTED, this._onUnselected);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._onKeyDown);

    this.removeEventListener(UUISelectableEvent.SELECTED, this._onSelected);
    this.removeEventListener(UUISelectableEvent.UNSELECTED, this._onUnselected);
  }

  private _updateSelection() {
    this.displayValue = '';

    // Ensure the right items are selected.
    for (const option of this._options) {
      if (option.value === this._value) {
        this.displayValue = option.displayValue || '';
        option.selected = true;
      } else {
        option.selected = false;
      }
    }
  }

  private _onSlotChange = () => {
    this._activeElement = undefined;
    // Get index from first active, remove active from the rest.
    for (let i = 0; i < this._activeOptions.length; i++) {
      if (i === 0) {
        this._activeElement = this._activeOptions[i];
      } else {
        this._activeOptions[i].active = false;
      }
    }

    this._updateSelection();
    this.dispatchEvent(
      new UUIComboboxListEvent(UUIComboboxListEvent.SLOT_CHANGE)
    );
  };

  private _onSelected = (e: Event) => {
    if (this._selectedElement) {
      this._selectedElement.selected = false;
      this._selectedElement.active = false;
      this._selectedElement = undefined;
    }
    this._selectedElement = e.composedPath()[0] as UUIComboboxListOptionElement;
    this._activeElement = this._selectedElement;

    this.value = this._selectedElement.value || '';
    this.displayValue = this._selectedElement.displayValue || '';

    this.dispatchEvent(new UUIComboboxListEvent(UUIComboboxListEvent.CHANGE));
  };
  private _onUnselected = (e: Event) => {
    const el = e.composedPath()[0] as UUIComboboxListOptionElement;
    if (this._activeElement === el) {
      this._activeElement = undefined;
    }
    if (this._selectedElement === el) {
      this.value = '';
      this.displayValue = '';
      this.dispatchEvent(new UUIComboboxListEvent(UUIComboboxListEvent.CHANGE));
    }
  };

  private _getActiveIndex(): number {
    return this._activeElement
      ? this._options.indexOf(this._activeElement)
      : -1;
  }

  private _moveIndex = (distance: number) => {
    const newIndex = Math.min(
      Math.max(this._getActiveIndex() + distance, 0),
      this._options.length - 1
    );

    this._goToIndex(newIndex);
  };

  private _goToIndex(index: number) {
    index = Math.min(Math.max(index, 0), this._options.length - 1); // Makes sure the index stays within array length
    this._activeElement = this._options[index];

    if (this._activeElement) {
      this._activeElement.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    if (this._options.length <= 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.ctrlKey ? this._moveIndex(-10) : this._moveIndex(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        e.ctrlKey ? this._moveIndex(10) : this._moveIndex(1);

        break;

      case 'Home': {
        e.preventDefault();
        this._goToIndex(0);
        break;
      }

      case 'Enter': {
        e.preventDefault();
        this._activeElement?.click();
        break;
      }

      case 'End': {
        e.preventDefault();
        this._goToIndex(this._options.length - 1);
        break;
      }

      default:
        break;
    }
  };

  render() {
    return html` <slot @slotchange=${this._onSlotChange}></slot> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'uui-combobox-list': UUIComboboxListElement;
  }
}
