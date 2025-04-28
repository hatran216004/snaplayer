SnapLayer.elements = [];

SnapLayer.prototype._createButton = function (
  html,
  classNames = 'snaplayer__btn',
  callback
) {
  const button = document.createElement('button');
  button.innerHTML = html;
  if (typeof classNames == 'string') button.className = classNames;
  if (typeof callback === 'function') button.onclick = callback;
  return button;
};

SnapLayer.prototype._hasScrollbar = function (target) {
  if ([document.body, document.documentElement].includes(target)) {
    return (
      document.body.scrollHeight > document.body.clientHeight ||
      document.documentElement.scrollHeight >
        document.documentElement.clientHeight
    );
  }

  return target.scrollHeight > target.clientHeight;
};

SnapLayer.prototype._getScrollbarWidth = function () {
  if (this._scrollbarWidth) return this._scrollbarWidth;

  const div = document.createElement('div');
  Object.assign(div.style, {
    overflow: 'scroll',
    position: 'absolute',
    top: '-99999px'
  });

  document.body.appendChild(div);

  this._scrollbarWidth = div.offsetWidth - div.clientWidth;

  document.body.removeChild(div);

  return this._scrollbarWidth;
};

SnapLayer.prototype._onTransitionEnd = function (callback) {
  this._backdrop.ontransitionend = (e) => {
    if (e.propertyName !== 'transform') return;
    if (typeof callback === 'function') callback();
  };
};

SnapLayer.prototype._handleEscapeKey = function (e) {
  const isLastModal =
    this === SnapLayer.elements[SnapLayer.elements.length - 1];
  if (e.key === 'Escape' && isLastModal) {
    this.close();
  }
};

SnapLayer.prototype.setContent = function (html) {
  this.content = html;
  if (this._modalContent) {
    this._modalContent.innerHTML = this.content;
  }
};

SnapLayer.prototype.setFooterContent = function (html) {
  this._footerContent = html;
  this._renderFooterContent();
};

SnapLayer.prototype._renderFooterContent = function () {
  if (this._footer && this._footerContent)
    this._footer.innerHTML = this._footerContent;
};

SnapLayer.prototype._renderFooterButtons = function () {
  if (this._footer)
    this._footerButtons.forEach((button) => this._footer.append(button));
};

SnapLayer.prototype.destroy = function () {
  this.close(true);
};

SnapLayer.prototype.addFooterButton = function (html, classNames, callback) {
  const button = this._createButton(html, classNames, callback);
  this._footerButtons.push(button);
  this._renderFooterButtons();
};

SnapLayer.prototype._build = function () {
  const contentNode = this.content
    ? document.createElement('div')
    : this._template.content.cloneNode(true);

  if (this.content) contentNode.innerHTML = this.content;

  this._backdrop = document.createElement('div');
  this._backdrop.className = 'snaplayer';

  const container = document.createElement('div');
  container.className = 'snaplayer__container';
  this._otp.cssClasses.forEach((className) => {
    if (typeof className === 'string') container.classList.add(className);
  });

  if (this._allowButtonClose) {
    const closeBtn = this._createButton('&times;', 'snaplayer__close', () =>
      this.close()
    );
    container.append(closeBtn);
  }

  this._modalContent = document.createElement('div');
  this._modalContent.className = 'snaplayer__content';

  // Append html
  this._modalContent.append(contentNode);
  container.append(this._modalContent);

  if (this._otp.footer) {
    this._footer = document.createElement('footer');
    this._footer.className = 'snaplayer__footer';

    this._renderFooterContent();
    this._renderFooterButtons();

    container.append(this._footer);
  }

  this._backdrop.append(container);
  document.body.append(this._backdrop);
};

SnapLayer.prototype.open = function () {
  SnapLayer.elements.push(this);

  if (!this._backdrop) {
    this._build();
  }

  setTimeout(() => this._backdrop.classList.add('snaplayer--show'), 0);

  this._onTransitionEnd(this._otp.onOpen);

  if (this._allowBackdropClose) {
    this._backdrop.onclick = (e) => {
      if (e.target === this._backdrop) this.close();
    };
  }

  if (this._allowEscapeClose)
    window.addEventListener('keydown', this._handleEscapeKey);

  // Disable scroll
  if (this._otp.enableScrollLock) {
    const target = this._otp.scrollLockTarget();
    const targetPaddingRight = parseInt(getComputedStyle(target).paddingRight);

    if (this._hasScrollbar(target)) {
      target.classList.add('snaplayer--no-scroll');
      target.style.paddingRight =
        targetPaddingRight + this._getScrollbarWidth() + 'px';
    }
  }

  return this._backdrop;
};

SnapLayer.prototype.close = function (isDestroy = this._otp.destroyOnClose) {
  SnapLayer.elements.pop();
  this._backdrop.classList.remove('snaplayer--show');

  this._onTransitionEnd(() => {
    if (isDestroy) {
      this._backdrop.remove();
      this._backdrop = null;
      this._footer = null;
    }

    // Enable scroll
    if (!SnapLayer.elements.length && this._otp.enableScrollLock) {
      const target = this._otp.scrollLockTarget();

      if (this._hasScrollbar(target)) {
        target.classList.remove('snaplayer--no-scroll');
        target.style.paddingRight = '';
      }
    }

    if (typeof this._otp.onClose === 'function') this._otp.onClose();
  });

  if (this._allowEscapeClose) {
    window.removeEventListener('keydown', this._handleEscapeKey);
  }
};

function SnapLayer(options = {}) {
  let { templateId, content } = options;
  if (!templateId && !content) {
    return console.error(`Please provide 'templateId' or 'content'`);
  }
  if (templateId && content) {
    templateId = null;
    console.warn(
      `'templateId' will be ignore if provide 'templateId' and 'content'`
    );
  }

  if (templateId) {
    this._template = document.querySelector(`#${templateId}`);
    if (!this._template) return console.error(`${templateId} does not exist`);
  }

  this._otp = Object.assign(
    {
      closeMethods: ['button', 'overlay', 'escape'],
      cssClasses: [],
      destroyOnClose: true,
      footer: false,
      enableScrollLock: true,
      scrollLockTarget: () => document.body
    },
    options
  );

  this.content = content;
  this._allowBackdropClose = this._otp.closeMethods.includes('overlay');
  this._allowButtonClose = this._otp.closeMethods.includes('button');
  this._allowEscapeClose = this._otp.closeMethods.includes('escape');
  this._footerButtons = [];
  this._handleEscapeKey = this._handleEscapeKey.bind(this);
}
