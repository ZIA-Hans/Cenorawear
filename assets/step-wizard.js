/**
 * Step Wizard Custom Element
 * 步骤向导组件 - 用于多步骤流程展示
 * 
 * @example
 * <step-wizard current-step="1">
 *   <div slot="step-1">
 *     <h3>第一步内容</h3>
 *   </div>
 *   <div slot="step-2">
 *     <h3>第二步内容</h3>
 *   </div>
 * </step-wizard>
 */
class StepWizard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentStep = 1;
    this.totalSteps = 0;
  }

  static get observedAttributes() {
    return ['current-step'];
  }

  connectedCallback() {
    this.totalSteps = this.querySelectorAll('[slot^="step-"]').length;
    this.currentStep = parseInt(this.getAttribute('current-step')) || 1;
    this.render();
    this.attachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'current-step' && oldValue !== newValue) {
      this.currentStep = parseInt(newValue) || 1;
      this.updateStepDisplay();
    }
  }

  render() {
    const styles = `
      <style>
        :host {
          display: block;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .wizard-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 20px;
          background: #fff;
          border-radius: 8px;
        }

        /* 步骤指示器 */
        .step-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid #e0e0e0;
          background: #fff;
          color: #999;
        }

        .step-number.active {
          background: #000;
          color: #fff;
          border-color: #000;
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .step-number.completed {
          background: #4caf50;
          border-color: #4caf50;
          color: #fff;
          transform: scale(1.05);
        }

        .step-divider {
          width: 40px;
          height: 2px;
          background: #e0e0e0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .step-divider.completed {
          background: #4caf50;
        }

        .step-divider.completed::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: shimmer 0.6s ease-out;
        }

        @keyframes shimmer {
          to {
            left: 100%;
          }
        }

        /* 步骤内容区域 */
        .step-content {
          min-height: 300px;
          padding: 24px;
          background: #f9f9f9;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }

        .step-content-inner {
          animation: fadeInSlide 0.4s ease-out;
        }

        .step-content.transitioning {
          pointer-events: none;
        }

        .step-content ::slotted(*) {
          display: block;
          animation: fadeInSlide 0.4s ease-out;
        }

        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeOutSlide {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }

        /* 按钮组 */
        .button-group {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-top: 16px;
        }

        button {
          padding: 12px 32px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-prev {
          background: #f5f5f5;
          color: #333;
        }

        .btn-prev:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-next {
          background: #000;
          color: #fff;
          margin-left: auto;
        }

        .btn-next:hover:not(:disabled) {
          background: #333;
        }

        /* 响应式 */
        @media (max-width: 640px) {
          .wizard-container {
            padding: 16px;
            gap: 16px;
          }

          .step-content {
            min-height: 250px;
            padding: 16px;
          }

          .step-divider {
            width: 24px;
          }

          .step-number {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          button {
            padding: 10px 24px;
            font-size: 13px;
          }
        }
      </style>
    `;

    const template = `
      ${styles}
      <div class="wizard-container">
        <div class="step-indicator" id="stepIndicator"></div>
        <div class="step-content">
          <slot name="step-${this.currentStep}"></slot>
        </div>
        <div class="button-group">
          <button class="btn-prev" id="prevBtn" type="button">
            ← Prev
          </button>
          <button class="btn-next" id="nextBtn" type="button">
            Next →
          </button>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = template;
    this.renderStepIndicator();
  }

  renderStepIndicator() {
    const indicator = this.shadowRoot.getElementById('stepIndicator');
    if (!indicator) return;

    let html = '';
    for (let i = 1; i <= this.totalSteps; i++) {
      const isActive = i === this.currentStep;
      const isCompleted = i < this.currentStep;
      
      html += `
        <div class="step-item">
          <div class="step-number ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
            ${isCompleted ? '✓' : i}
          </div>
          ${i < this.totalSteps ? `<div class="step-divider ${isCompleted ? 'completed' : ''}"></div>` : ''}
        </div>
      `;
    }
    
    indicator.innerHTML = html;
  }

  attachEventListeners() {
    const prevBtn = this.shadowRoot.getElementById('prevBtn');
    const nextBtn = this.shadowRoot.getElementById('nextBtn');

    prevBtn.addEventListener('click', () => this.goToPrevStep());
    nextBtn.addEventListener('click', () => this.goToNextStep());

    this.updateButtonStates();
  }

  goToNextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.setAttribute('current-step', this.currentStep);
      this.updateStepDisplay();
      this.dispatchStepChangeEvent();
    }
  }

  goToPrevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.setAttribute('current-step', this.currentStep);
      this.updateStepDisplay();
      this.dispatchStepChangeEvent();
    }
  }

  updateStepDisplay() {
    const stepContent = this.shadowRoot.querySelector('.step-content');
    if (!stepContent) return;

    // 添加过渡状态
    stepContent.classList.add('transitioning');

    // 先淡出当前内容
    const currentSlot = stepContent.querySelector('slot');
    if (currentSlot) {
      currentSlot.style.animation = 'fadeOutSlide 0.2s ease-in';
    }

    // 延迟切换内容，让淡出动画完成
    setTimeout(() => {
      // 更新内容显示 - 重新渲染 slot 容器
      stepContent.innerHTML = `<slot name="step-${this.currentStep}"></slot>`;
      
      // 移除过渡状态
      setTimeout(() => {
        stepContent.classList.remove('transitioning');
      }, 400);
    }, 200);

    // 更新步骤指示器
    this.renderStepIndicator();
    
    // 更新按钮状态
    this.updateButtonStates();
  }

  updateButtonStates() {
    const prevBtn = this.shadowRoot.getElementById('prevBtn');
    const nextBtn = this.shadowRoot.getElementById('nextBtn');

    if (prevBtn) {
      prevBtn.disabled = this.currentStep === 1;
    }

    if (nextBtn) {
      if (this.currentStep === this.totalSteps) {
        nextBtn.textContent = 'Finish ✓';
        nextBtn.classList.add('btn-finish');
      } else {
        nextBtn.textContent = 'Next →';
        nextBtn.classList.remove('btn-finish');
      }
    }
  }

  dispatchStepChangeEvent() {
    this.dispatchEvent(new CustomEvent('step-change', {
      detail: {
        currentStep: this.currentStep,
        totalSteps: this.totalSteps
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * 公开方法：跳转到指定步骤
   * @param {number} step - 目标步骤
   */
  goToStep(step) {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      this.setAttribute('current-step', step);
      this.updateStepDisplay();
      this.dispatchStepChangeEvent();
    }
  }

  /**
   * 公开方法：获取当前步骤
   * @returns {number}
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * 公开方法：获取总步骤数
   * @returns {number}
   */
  getTotalSteps() {
    return this.totalSteps;
  }
}

// 注册 Custom Element
customElements.define('step-wizard', StepWizard);

