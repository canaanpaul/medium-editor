/*global Util */

var Events;

(function () {
    'use strict';

    Events = function (instance) {
        this.base = instance;
        this.options = this.base.options;
        this.events = [];
        this.customEvents = {};
        this.listeners = {};
    };

    Events.prototype = {

        InputEventOnContenteditableSupported: false,

        // Helpers for event handling

        attachDOMEvent: function (target, event, listener, useCapture) {
            target.addEventListener(event, listener, useCapture);
            this.events.push([target, event, listener, useCapture]);
        },

        detachDOMEvent: function (target, event, listener, useCapture) {
            var index = this.indexOfListener(target, event, listener, useCapture),
                e;
            if (index !== -1) {
                e = this.events.splice(index, 1)[0];
                e[0].removeEventListener(e[1], e[2], e[3]);
            }
        },

        indexOfListener: function (target, event, listener, useCapture) {
            var i, n, item;
            for (i = 0, n = this.events.length; i < n; i = i + 1) {
                item = this.events[i];
                if (item[0] === target && item[1] === event && item[2] === listener && item[3] === useCapture) {
                    return i;
                }
            }
            return -1;
        },

        detachAllDOMEvents: function () {
            var e = this.events.pop();
            while (e) {
                e[0].removeEventListener(e[1], e[2], e[3]);
                e = this.events.pop();
            }
        },

        // custom events
        attachCustomEvent: function (event, listener) {
            this.setupListener(event);
            // If we don't suppot this custom event, don't do anything
            if (this.listeners[event]) {
                if (!this.customEvents[event]) {
                    this.customEvents[event] = [];
                }
                this.customEvents[event].push(listener);
            }
        },

        detachCustomEvent: function (event, listener) {
            var index = this.indexOfCustomListener(event, listener);
            if (index !== -1) {
                this.customEvents[event].splice(index, 1);
                // TODO: If array is empty, should detach internal listeners via destoryListener()
            }
        },

        indexOfCustomListener: function (event, listener) {
            if (!this.customEvents[event] || !this.customEvents[event].length) {
                return -1;
            }

            return this.customEvents[event].indexOf(listener);
        },

        detachAllCustomEvents: function () {
            this.customEvents = {};
            // TODO: Should detach internal listeners here via destroyListener()
        },

        triggerCustomEvent: function (name, data, editable) {
            if (this.customEvents[name]) {
                this.customEvents[name].forEach(function (listener) {
                    listener(data, editable);
                });
            }
        },

        // Listening to browser events to emit events medium-editor cares about

        setupListener: function (name) {
            if (this.listeners[name]) {
                return;
            }

            switch (name) {
            case 'externalInteraction':
                // Detecting when user has interacted with elements outside of MediumEditor
                this.attachDOMEvent(this.options.ownerDocument.body, 'mousedown', this.handleBodyMousedown.bind(this), true);
                this.attachDOMEvent(this.options.ownerDocument.body, 'click', this.handleBodyClick.bind(this), true);
                this.attachDOMEvent(this.options.ownerDocument.body, 'focus', this.handleBodyFocus.bind(this), true);
                this.listeners[name] = true;
                break;
            case 'blur':
                // Detecting when focus is lost
                this.setupListener('externalInteraction');
                this.listeners[name] = true;
                break;
            case 'focus':
                // Detecting when focus moves into some part of MediumEditor
                this.setupListener('externalInteraction');
                this.listeners[name] = true;
                break;
            case 'editableInput':
                // setup cache for knowing when the content has changed
                this.contentCache = [];
                this.base.elements.forEach(function (element) {
                    this.contentCache[element.getAttribute('medium-editor-index')] = element.innerHTML;

                    // Attach to the 'oninput' event, handled correctly by most browsers
                    if (this.InputEventOnContenteditableSupported) {
                        this.attachDOMEvent(element, 'input', this.handleInput.bind(this));
                    }
                }.bind(this));

                // For browsers which don't support the input event on contenteditable (IE)
                // we'll attach to 'selectionchange' on the document and 'keypress' on the editables
                if (!this.InputEventOnContenteditableSupported) {
                    this.setupListener('editableKeypress');
                    this.keypressUpdateInput = true;
                    this.attachDOMEvent(document, 'selectionchange', this.handleDocumentSelectionChange.bind(this));
                }

                this.listeners[name] = true;
                break;
            case 'editableClick':
                // Detecting click in the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'click', this.handleClick.bind(this));
                }.bind(this));
                this.listeners[name] = true;
                break;
            case 'editableBlur':
                // Detecting blur in the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'blur', this.handleBlur.bind(this));
                }.bind(this));
                this.listeners[name] = true;
                break;
            case 'editableKeypress':
                // Detecting keypress in the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'keypress', this.handleKeypress.bind(this));
                }.bind(this));
                this.listeners[name] = true;
                break;
            case 'editableKeyup':
                // Detecting keyup in the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'keyup', this.handleKeyup.bind(this));
                }.bind(this));
                this.listeners[name] = true;
                break;
            case 'editableKeydown':
                // Detecting keydown on the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'keydown', this.handleKeydown.bind(this));
                }.bind(this));
                this.listeners[name] = true;
                break;
            case 'editableKeydownEnter':
                // Detecting keydown for ENTER on the contenteditables
                this.setupListener('editableKeydown');
                this.listeners[name] = true;
                break;
            case 'editableKeydownTab':
                // Detecting keydown for TAB on the contenteditable
                this.setupListener('editableKeydown');
                this.listeners[name] = true;
                break;
            case 'editableKeydownDelete':
                // Detecting keydown for DELETE/BACKSPACE on the contenteditables
                this.setupListener('editableKeydown');
                this.listeners[name] = true;
                break;
            case 'editableMouseover':
                // Detecting mouseover on the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'mouseover', this.handleMouseover.bind(this));
                }, this);
                this.listeners[name] = true;
                break;
            case 'editableDrag':
                // Detecting dragover and dragleave on the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'dragover', this.handleDragging.bind(this));
                    this.attachDOMEvent(element, 'dragleave', this.handleDragging.bind(this));
                }, this);
                this.listeners[name] = true;
                break;
            case 'editableDrop':
                // Detecting drop on the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'drop', this.handleDrop.bind(this));
                }, this);
                this.listeners[name] = true;
                break;
            case 'editablePaste':
                // Detecting paste on the contenteditables
                this.base.elements.forEach(function (element) {
                    this.attachDOMEvent(element, 'paste', this.handlePaste.bind(this));
                }, this);
                this.listeners[name] = true;
                break;
            }
        },

        focusElement: function (element) {
            element.focus();
            this.updateFocus(element, { target: element, type: 'focus' });
        },

        updateFocus: function (target, eventObj) {
            var toolbarEl = this.base.toolbar ? this.base.toolbar.getToolbarElement() : null,
                anchorPreview = this.base.getExtensionByName('anchor-preview'),
                previewEl = (anchorPreview && anchorPreview.getPreviewElement) ? anchorPreview.getPreviewElement() : null,
                hadFocus,
                toFocus;

            this.base.elements.some(function (element) {
                // Find the element that has focus
                if (!hadFocus && element.getAttribute('data-medium-focused')) {
                    hadFocus = element;
                }

                // bail if we found the element that had focus
                return !!hadFocus;
            }, this);

            // For clicks, we need to know if the mousedown that caused the click happened inside the existing focused element.
            // If so, we don't want to focus another element
            if (hadFocus &&
                    eventObj.type === 'click' &&
                    this.lastMousedownTarget &&
                    (Util.isDescendant(hadFocus, this.lastMousedownTarget, true) ||
                     Util.isDescendant(toolbarEl, this.lastMousedownTarget, true) ||
                     Util.isDescendant(previewEl, this.lastMousedownTarget, true))) {
                toFocus = hadFocus;
            }

            if (!toFocus) {
                this.base.elements.some(function (element) {
                    // If the target is part of an editor element, this is the element getting focus
                    if (!toFocus && (Util.isDescendant(element, target, true))) {
                        toFocus = element;
                    }

                    // bail if we found an element that's getting focus
                    return !!toFocus;
                }, this);
            }

            // Check if the target is external (not part of the editor, toolbar, or anchorpreview)
            var externalEvent = !Util.isDescendant(hadFocus, target, true) &&
                                !Util.isDescendant(toolbarEl, target, true) &&
                                !Util.isDescendant(previewEl, target, true);

            if (toFocus !== hadFocus) {
                // If element has focus, and focus is going outside of editor
                // Don't blur focused element if clicking on editor, toolbar, or anchorpreview
                if (hadFocus && externalEvent) {
                    // Trigger blur on the editable that has lost focus
                    hadFocus.removeAttribute('data-medium-focused');
                    this.triggerCustomEvent('blur', eventObj, hadFocus);
                }

                // If focus is going into an editor element
                if (toFocus) {
                    // Trigger focus on the editable that now has focus
                    toFocus.setAttribute('data-medium-focused', true);
                    this.triggerCustomEvent('focus', eventObj, toFocus);
                }
            }

            if (externalEvent) {
                this.triggerCustomEvent('externalInteraction', eventObj);
            }
        },

        updateInput: function (target, eventObj) {
            var index = target.getAttribute('medium-editor-index');
            if (target.innerHTML !== this.contentCache[index]) {
                this.triggerCustomEvent('editableInput', eventObj, target);
            }
            this.contentCache[index] = target.innerHTML;
        },

        handleDocumentSelectionChange: function (event) {
            if (event.currentTarget &&
                event.currentTarget.activeElement) {
                var activeElement = event.currentTarget.activeElement,
                    currentTarget;
                this.base.elements.some(function (element) {
                    if (Util.isDescendant(element, activeElement, true)) {
                        currentTarget = element;
                        return true;
                    }
                    return false;
                }, this);
                if (currentTarget) {
                    this.updateInput(currentTarget, { target: activeElement, currentTarget: currentTarget });
                }
            }
        },

        handleBodyClick: function (event) {
            this.updateFocus(event.target, event);
        },

        handleBodyFocus: function (event) {
            this.updateFocus(event.target, event);
        },

        handleBodyMousedown: function (event) {
            this.lastMousedownTarget = event.target;
        },

        handleInput: function (event) {
            this.updateInput(event.currentTarget, event);
        },

        handleClick: function (event) {
            this.triggerCustomEvent('editableClick', event, event.currentTarget);
        },

        handleBlur: function (event) {
            this.triggerCustomEvent('editableBlur', event, event.currentTarget);
        },

        handleKeypress: function (event) {
            this.triggerCustomEvent('editableKeypress', event, event.currentTarget);

            if (this.keypressUpdateInput) {
                var eventObj = { target: event.target, currentTarget: event.currentTarget };
                setTimeout(function () {
                    this.updateInput(eventObj.currentTarget, eventObj);
                }.bind(this), 0);
            }
        },

        handleKeyup: function (event) {
            this.triggerCustomEvent('editableKeyup', event, event.currentTarget);
        },

        handleMouseover: function (event) {
            this.triggerCustomEvent('editableMouseover', event, event.currentTarget);
        },

        handleDragging: function (event) {
            this.triggerCustomEvent('editableDrag', event, event.currentTarget);
        },

        handleDrop: function (event) {
            this.triggerCustomEvent('editableDrop', event, event.currentTarget);
        },

        handlePaste: function (event) {
            this.triggerCustomEvent('editablePaste', event, event.currentTarget);
        },

        handleKeydown: function (event) {
            this.triggerCustomEvent('editableKeydown', event, event.currentTarget);

            switch (event.which) {
            case Util.keyCode.ENTER:
                this.triggerCustomEvent('editableKeydownEnter', event, event.currentTarget);
                break;
            case Util.keyCode.TAB:
                this.triggerCustomEvent('editableKeydownTab', event, event.currentTarget);
                break;
            case Util.keyCode.DELETE:
            case Util.keyCode.BACKSPACE:
                this.triggerCustomEvent('editableKeydownDelete', event, event.currentTarget);
                break;
            }
        }
    };

    // Do feature detection to determine with the 'input' event is supported on contenteditable elements
    // Currently, IE does not support this event on contenteditable elements

    var tempFunction = function () {
            Events.prototype.InputEventOnContenteditableSupported = true;
        },
        tempElement,
        existingRanges = [];

    // Create a temporary contenteditable element with an 'oninput' event listener
    tempElement = document.createElement('div');
    tempElement.setAttribute('contenteditable', true);
    tempElement.innerHTML = 't';
    tempElement.addEventListener('input', tempFunction);
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-100px';
    tempElement.style.top = '-100px';
    document.body.appendChild(tempElement);

    // Store any existing ranges that may exist
    var selection = document.getSelection();
    for (var i = 0; i < selection.rangeCount; i++) {
        existingRanges.push(selection.getRangeAt(i));
    }

    // Create a new range containing the content of the temporary contenteditable element
    // and replace the selection to only contain this range
    var range = document.createRange();
    range.selectNodeContents(tempElement);
    selection.removeAllRanges();
    selection.addRange(range);

    // Call 'execCommand' on the current selection, which will cause the input event to be triggered if it's supported
    document.execCommand('bold', false, null);

    // Cleanup the temporary element
    tempElement.removeEventListener('input', tempFunction);
    tempElement.parentNode.removeChild(tempElement);
    tempElement.removeEventListener('input', tempFunction);
    selection.removeAllRanges();

    // Restore any existing ranges
    if (existingRanges.length) {
        for (i = 0; i < existingRanges.length; i++) {
            selection.addRange(existingRanges[i]);
        }
    }

}());
