/**
 * Offline React 18 compatible micro-runtime.
 * Ensures zero-dependency offline resilience when external CDNs cannot be resolved.
 */
(function(global) {
  if (global.React && global.ReactDOM) return;

  let currentComponent = null;
  let hookIndex = 0;

  function createElement(type, props, ...children) {
    const flatChildren = children.flat().filter(c => c !== null && c !== undefined && c !== false);
    return {
      type,
      props: {
        ...(props || {}),
        children: flatChildren.length === 1 ? flatChildren[0] : flatChildren
      }
    };
  }

  function useState(initial) {
    const comp = currentComponent;
    const idx = hookIndex++;
    if (!comp.hooks[idx]) {
      comp.hooks[idx] = typeof initial === 'function' ? initial() : initial;
    }
    const setter = (newVal) => {
      const next = typeof newVal === 'function' ? newVal(comp.hooks[idx]) : newVal;
      if (comp.hooks[idx] !== next) {
        comp.hooks[idx] = next;
        comp.scheduleUpdate();
      }
    };
    return [comp.hooks[idx], setter];
  }

  function useEffect(cb, deps) {
    const comp = currentComponent;
    const idx = hookIndex++;
    const old = comp.hooks[idx];
    const hasChanged = !old || !deps || deps.some((d, i) => d !== old.deps[i]);
    if (hasChanged) {
      if (old && typeof old.cleanup === 'function') old.cleanup();
      comp.effects.push(() => {
        const cleanup = cb();
        comp.hooks[idx] = { deps, cleanup };
      });
    }
  }

  function useRef(initial) {
    const comp = currentComponent;
    const idx = hookIndex++;
    if (!comp.hooks[idx]) {
      comp.hooks[idx] = { current: initial };
    }
    return comp.hooks[idx];
  }

  function renderVNode(vnode) {
    if (vnode === null || vnode === undefined || vnode === false) return document.createTextNode('');
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return document.createTextNode(String(vnode));
    }

    if (typeof vnode.type === 'function') {
      // Component function
      const compInstance = {
        hooks: [],
        effects: [],
        scheduleUpdate: () => {
          setTimeout(() => {
            hookIndex = 0;
            currentComponent = compInstance;
            const updatedVNode = vnode.type(vnode.props || {});
            currentComponent = null;
            const newDom = renderVNode(updatedVNode);
            if (compInstance.dom && compInstance.dom.parentNode) {
              compInstance.dom.parentNode.replaceChild(newDom, compInstance.dom);
              compInstance.dom = newDom;
            }
            compInstance.effects.forEach(eff => eff());
            compInstance.effects = [];
          }, 0);
        }
      };

      hookIndex = 0;
      currentComponent = compInstance;
      const res = vnode.type(vnode.props || {});
      currentComponent = null;
      const dom = renderVNode(res);
      compInstance.dom = dom;
      setTimeout(() => {
        compInstance.effects.forEach(eff => eff());
        compInstance.effects = [];
      }, 0);
      return dom;
    }

    // HTML DOM Element
    const el = document.createElement(vnode.type);
    const props = vnode.props || {};

    for (const [key, val] of Object.entries(props)) {
      if (key === 'children') continue;
      if (key === 'className') {
        el.className = val;
      } else if (key.startsWith('on') && typeof val === 'function') {
        const eventName = key.substring(2).toLowerCase();
        el.addEventListener(eventName, val);
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(el.style, val);
      } else if (key === 'dangerouslySetInnerHTML' && val && val.__html) {
        el.innerHTML = val.__html;
      } else if (typeof val === 'boolean') {
        if (val) el.setAttribute(key, '');
        else el.removeAttribute(key);
      } else if (val !== undefined && val !== null) {
        el.setAttribute(key, val);
      }
    }

    const children = Array.isArray(props.children) ? props.children : (props.children !== undefined ? [props.children] : []);
    children.forEach(child => {
      el.appendChild(renderVNode(child));
    });

    return el;
  }

  const React = {
    createElement,
    useState,
    useEffect,
    useRef
  };

  const ReactDOM = {
    createRoot(container) {
      return {
        render(vnode) {
          container.innerHTML = '';
          const dom = renderVNode(vnode);
          container.appendChild(dom);
        }
      };
    }
  };

  global.React = React;
  global.ReactDOM = ReactDOM;
})(window);

