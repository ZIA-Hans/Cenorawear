/**
 * Size Guide Wizard Loader
 * 动态加载并渲染 wizard section 到 size-guide 抽屉中
 */

class SizeGuideWizardLoader {
  constructor() {
    this.drawer = document.getElementById('size-guide');
    this.container = document.getElementById('wizard-container');
    this.isLoaded = false;
    this.isLoading = false;

    if (!this.drawer || !this.container) {
      return;
    }

    this.pageHandle = this.drawer.dataset.wizardPage;
    
    if (!this.pageHandle) {
      return;
    }

    this.init();
  }

  /**
   * 初始化
   */
  init() {
    // 监听抽屉打开事件
    this.observeDrawerOpen();
    
    // 如果抽屉已经打开（比如页面加载时就打开），立即加载
    if (this.drawer.getAttribute('aria-hidden') === 'false') {
      this.loadWizardContent();
    }
  }

  /**
   * 监听抽屉打开
   */
  observeDrawerOpen() {
    // 使用 MutationObserver 监听 aria-hidden 属性变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const isHidden = this.drawer.getAttribute('aria-hidden') === 'true';
          
          if (!isHidden && !this.isLoaded && !this.isLoading) {
            this.loadWizardContent();
          }
        }
      });
    });

    observer.observe(this.drawer, {
      attributes: true,
      attributeFilter: ['aria-hidden']
    });

    // 备用方案：监听触发按钮的点击
    const triggerButton = document.querySelector('[data-panel="size-guide"]');
    if (triggerButton) {
      triggerButton.addEventListener('click', () => {
        setTimeout(() => {
          if (!this.isLoaded && !this.isLoading) {
            this.loadWizardContent();
          }
        }, 100);
      });
    }
  }

  /**
   * 加载 wizard 内容
   */
  async loadWizardContent() {
    if (this.isLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showLoadingState();

    console.log('[Wizard Loader] Starting to load wizard from page:', this.pageHandle);

    try {
      // 直接 fetch 完整的 page HTML
      const url = `/pages/${this.pageHandle}`;
      console.log('[Wizard Loader] Fetching URL:', url);
      
      const response = await fetch(url);
      
      console.log('[Wizard Loader] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log('[Wizard Loader] Received HTML length:', html.length);
      
      // 从响应中提取 wizard section
      const wizardContent = this.extractWizardSection(html);

      if (wizardContent) {
        console.log('[Wizard Loader] Successfully extracted wizard content');
        this.renderWizardContent(wizardContent);
        this.isLoaded = true;
      } else {
        throw new Error('Wizard section not found in page');
      }

    } catch (error) {
      console.error('[Wizard Loader] Failed to load size guide wizard:', error);
      this.showErrorState(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 从 HTML 中提取 wizard section
   * @param {string} html 
   * @returns {string|null}
   */
  extractWizardSection(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log('[Wizard Loader] Attempting to extract wizard section...');
    
    // 方案 1: 查找带有特定 class 的 section
    let wizardSection = doc.querySelector('.size-guide-wizard-section');
    if (wizardSection) {
      console.log('[Wizard Loader] Found section with class: .size-guide-wizard-section');
      return wizardSection.outerHTML;
    }
    
    // 方案 2: 查找 section 标签且包含特定 class
    wizardSection = doc.querySelector('section.section-size-guide-wizard');
    if (wizardSection) {
      console.log('[Wizard Loader] Found <section> with class: .section-size-guide-wizard');
      return wizardSection.outerHTML;
    }
    
    // 方案 3: 查找任何包含 wizard 关键词的 section
    wizardSection = doc.querySelector('section[class*="wizard"]');
    if (wizardSection) {
      console.log('[Wizard Loader] Found <section> with wizard keyword in class');
      return wizardSection.outerHTML;
    }

    // 方案 4: 查找包含 step-wizard 自定义元素的容器
    const stepWizard = doc.querySelector('step-wizard');
    if (stepWizard) {
      console.log('[Wizard Loader] Found step-wizard element');
      // 获取父容器（通常是包裹 wizard 的 div 或 section）
      let container = stepWizard.closest('section') || 
                      stepWizard.closest('.size-guide-wizard-section') ||
                      stepWizard.closest('[class*="wizard"]');
      
      if (container) {
        console.log('[Wizard Loader] Found step-wizard container');
        return container.outerHTML;
      }
      
      // 如果找不到合适的容器，返回 step-wizard 本身及其父元素
      if (stepWizard.parentElement) {
        console.log('[Wizard Loader] Using step-wizard parent element');
        return stepWizard.parentElement.outerHTML;
      }
    }

    console.error('[Wizard Loader] Wizard section not found. Available sections:', 
                  Array.from(doc.querySelectorAll('section, [class*="section"]')).map(el => el.className));
    
    return null;
  }

  /**
   * 渲染 wizard 内容
   * @param {string} content 
   */
  renderWizardContent(content) {
    this.container.innerHTML = content;

    // 确保 step-wizard.js 已加载
    this.ensureWizardScriptLoaded();

    // 触发自定义事件，通知其他组件
    this.container.dispatchEvent(new CustomEvent('wizard-loaded', {
      bubbles: true,
      detail: { pageHandle: this.pageHandle }
    }));
  }

  /**
   * 确保 wizard 脚本已加载
   */
  ensureWizardScriptLoaded() {
    if (customElements.get('step-wizard')) {
      // 自定义元素已注册，触发初始化
      const wizardElement = this.container.querySelector('step-wizard');
      if (wizardElement && wizardElement.connectedCallback) {
        wizardElement.connectedCallback();
      }
      return;
    }

    // 如果脚本未加载，动态加载
    const existingScript = document.querySelector('script[src*="step-wizard.js"]');
    if (existingScript) {
      return; // 脚本已在页面中
    }

    const script = document.createElement('script');
    script.src = this.getAssetUrl('step-wizard.js');
    script.defer = true;
    document.head.appendChild(script);
  }

  /**
   * 获取 asset URL
   * @param {string} filename 
   * @returns {string}
   */
  getAssetUrl(filename) {
    // 从现有的 asset 标签中提取 URL 模式
    const assetScript = document.querySelector('script[src*="/assets/"]');
    if (assetScript) {
      const baseUrl = assetScript.src.substring(0, assetScript.src.lastIndexOf('/') + 1);
      return baseUrl + filename;
    }
    return `/assets/${filename}`;
  }

  /**
   * 显示加载状态
   */
  showLoadingState() {
    this.container.innerHTML = `
      <div class="wizard-loading" style="text-align: center; padding: 40px 20px;">
        <div class="spinner" style="
          border: 3px solid rgba(0,0,0,0.1);
          border-top: 3px solid #333;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        "></div>
        <p style="color: #666; font-size: 14px;">Loading size guide...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * 显示错误状态
   */
  showErrorState(errorMessage = 'Failed to load size guide wizard') {
    this.container.innerHTML = `
      <div class="wizard-error" style="text-align: center; padding: 40px 20px;">
        <p style="color: #d32f2f; font-size: 14px; margin-bottom: 8px;">
          ${errorMessage}
        </p>
        <p style="color: #666; font-size: 12px; margin-bottom: 16px;">
          Please check the console for more details.
        </p>
        <button 
          onclick="window.location.href='/pages/${this.pageHandle}'" 
          style="
            padding: 10px 20px;
            background: #333;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">
          View Full Guide
        </button>
      </div>
    `;
  }
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SizeGuideWizardLoader();
  });
} else {
  new SizeGuideWizardLoader();
}

