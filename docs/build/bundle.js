
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop$1(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text$1(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text$1(' ');
    }
    function empty() {
        return text$1('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash$1(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash$1(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop$1(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var EOL = {},
        EOF = {},
        QUOTE = 34,
        NEWLINE = 10,
        RETURN = 13;

    function objectConverter(columns) {
      return new Function("d", "return {" + columns.map(function(name, i) {
        return JSON.stringify(name) + ": d[" + i + "] || \"\"";
      }).join(",") + "}");
    }

    function customConverter(columns, f) {
      var object = objectConverter(columns);
      return function(row, i) {
        return f(object(row), i, columns);
      };
    }

    // Compute unique columns in order of discovery.
    function inferColumns(rows) {
      var columnSet = Object.create(null),
          columns = [];

      rows.forEach(function(row) {
        for (var column in row) {
          if (!(column in columnSet)) {
            columns.push(columnSet[column] = column);
          }
        }
      });

      return columns;
    }

    function pad(value, width) {
      var s = value + "", length = s.length;
      return length < width ? new Array(width - length + 1).join(0) + s : s;
    }

    function formatYear(year) {
      return year < 0 ? "-" + pad(-year, 6)
        : year > 9999 ? "+" + pad(year, 6)
        : pad(year, 4);
    }

    function formatDate(date) {
      var hours = date.getUTCHours(),
          minutes = date.getUTCMinutes(),
          seconds = date.getUTCSeconds(),
          milliseconds = date.getUTCMilliseconds();
      return isNaN(date) ? "Invalid Date"
          : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2)
          + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z"
          : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z"
          : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z"
          : "");
    }

    function dsvFormat(delimiter) {
      var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
          DELIMITER = delimiter.charCodeAt(0);

      function parse(text, f) {
        var convert, columns, rows = parseRows(text, function(row, i) {
          if (convert) return convert(row, i - 1);
          columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
        });
        rows.columns = columns || [];
        return rows;
      }

      function parseRows(text, f) {
        var rows = [], // output rows
            N = text.length,
            I = 0, // current character index
            n = 0, // current line number
            t, // current token
            eof = N <= 0, // current token followed by EOF?
            eol = false; // current token followed by EOL?

        // Strip the trailing newline.
        if (text.charCodeAt(N - 1) === NEWLINE) --N;
        if (text.charCodeAt(N - 1) === RETURN) --N;

        function token() {
          if (eof) return EOF;
          if (eol) return eol = false, EOL;

          // Unescape quotes.
          var i, j = I, c;
          if (text.charCodeAt(j) === QUOTE) {
            while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
            if ((i = I) >= N) eof = true;
            else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
            else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
            return text.slice(j + 1, i - 1).replace(/""/g, "\"");
          }

          // Find next delimiter or newline.
          while (I < N) {
            if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
            else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
            else if (c !== DELIMITER) continue;
            return text.slice(j, i);
          }

          // Return last token before EOF.
          return eof = true, text.slice(j, N);
        }

        while ((t = token()) !== EOF) {
          var row = [];
          while (t !== EOL && t !== EOF) row.push(t), t = token();
          if (f && (row = f(row, n++)) == null) continue;
          rows.push(row);
        }

        return rows;
      }

      function preformatBody(rows, columns) {
        return rows.map(function(row) {
          return columns.map(function(column) {
            return formatValue(row[column]);
          }).join(delimiter);
        });
      }

      function format(rows, columns) {
        if (columns == null) columns = inferColumns(rows);
        return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
      }

      function formatBody(rows, columns) {
        if (columns == null) columns = inferColumns(rows);
        return preformatBody(rows, columns).join("\n");
      }

      function formatRows(rows) {
        return rows.map(formatRow).join("\n");
      }

      function formatRow(row) {
        return row.map(formatValue).join(delimiter);
      }

      function formatValue(value) {
        return value == null ? ""
            : value instanceof Date ? formatDate(value)
            : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
            : value;
      }

      return {
        parse: parse,
        parseRows: parseRows,
        format: format,
        formatBody: formatBody,
        formatRows: formatRows,
        formatRow: formatRow,
        formatValue: formatValue
      };
    }

    var csv$1 = dsvFormat(",");

    var csvParse = csv$1.parse;

    function responseText(response) {
      if (!response.ok) throw new Error(response.status + " " + response.statusText);
      return response.text();
    }

    function text(input, init) {
      return fetch(input, init).then(responseText);
    }

    function dsvParse(parse) {
      return function(input, init, row) {
        if (arguments.length === 2 && typeof init === "function") row = init, init = undefined;
        return text(input, init).then(function(response) {
          return parse(response, row);
        });
      };
    }

    var csv = dsvParse(csvParse);

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    /**
     * iterateObject
     * Iterates an object. Note the object field order may differ.
     *
     * @name iterateObject
     * @function
     * @param {Object} obj The input object.
     * @param {Function} fn A function that will be called with the current value, field name and provided object.
     * @return {Function} The `iterateObject` function.
     */
    function iterateObject(obj, fn) {
        var i = 0,
            keys = [];

        if (Array.isArray(obj)) {
            for (; i < obj.length; ++i) {
                if (fn(obj[i], i, obj) === false) {
                    break;
                }
            }
        } else if ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object" && obj !== null) {
            keys = Object.keys(obj);
            for (; i < keys.length; ++i) {
                if (fn(obj[keys[i]], keys[i], obj) === false) {
                    break;
                }
            }
        }
    }

    var lib$2 = iterateObject;

    // Dependencies


    /**
     * mapObject
     * Array-map like for objects.
     *
     * @name mapObject
     * @function
     * @param {Object} obj The input object.
     * @param {Function} fn A function returning the field values.
     * @param {Boolean|Object} clone If `true`, the input object will be cloned.
     * If `clone` is an object, it will be used as target object.
     * @return {Object} The modified object.
     */
    function mapObject(obj, fn, clone) {
        var dst = clone === true ? {} : clone ? clone : obj;
        lib$2(obj, function (v, n, o) {
            dst[n] = fn(v, n, o);
        });
        return dst;
    }

    var lib$1 = mapObject;

    var grinning = {
    	keywords: [
    		"face",
    		"smile",
    		"happy",
    		"joy",
    		":D",
    		"grin"
    	],
    	char: "😀",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var grimacing = {
    	keywords: [
    		"face",
    		"grimace",
    		"teeth"
    	],
    	char: "😬",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var grin = {
    	keywords: [
    		"face",
    		"happy",
    		"smile",
    		"joy",
    		"kawaii"
    	],
    	char: "😁",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var joy = {
    	keywords: [
    		"face",
    		"cry",
    		"tears",
    		"weep",
    		"happy",
    		"happytears",
    		"haha"
    	],
    	char: "😂",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var rofl = {
    	keywords: [
    		"face",
    		"rolling",
    		"floor",
    		"laughing",
    		"lol",
    		"haha"
    	],
    	char: "🤣",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var partying = {
    	keywords: [
    		"face",
    		"celebration",
    		"woohoo"
    	],
    	char: "🥳",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smiley = {
    	keywords: [
    		"face",
    		"happy",
    		"joy",
    		"haha",
    		":D",
    		":)",
    		"smile",
    		"funny"
    	],
    	char: "😃",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smile = {
    	keywords: [
    		"face",
    		"happy",
    		"joy",
    		"funny",
    		"haha",
    		"laugh",
    		"like",
    		":D",
    		":)"
    	],
    	char: "😄",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sweat_smile = {
    	keywords: [
    		"face",
    		"hot",
    		"happy",
    		"laugh",
    		"sweat",
    		"smile",
    		"relief"
    	],
    	char: "😅",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var laughing = {
    	keywords: [
    		"happy",
    		"joy",
    		"lol",
    		"satisfied",
    		"haha",
    		"face",
    		"glad",
    		"XD",
    		"laugh"
    	],
    	char: "😆",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var innocent = {
    	keywords: [
    		"face",
    		"angel",
    		"heaven",
    		"halo"
    	],
    	char: "😇",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var wink = {
    	keywords: [
    		"face",
    		"happy",
    		"mischievous",
    		"secret",
    		";)",
    		"smile",
    		"eye"
    	],
    	char: "😉",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var blush = {
    	keywords: [
    		"face",
    		"smile",
    		"happy",
    		"flushed",
    		"crush",
    		"embarrassed",
    		"shy",
    		"joy"
    	],
    	char: "😊",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var slightly_smiling_face = {
    	keywords: [
    		"face",
    		"smile"
    	],
    	char: "🙂",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var upside_down_face = {
    	keywords: [
    		"face",
    		"flipped",
    		"silly",
    		"smile"
    	],
    	char: "🙃",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var relaxed = {
    	keywords: [
    		"face",
    		"blush",
    		"massage",
    		"happiness"
    	],
    	char: "☺️",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var yum = {
    	keywords: [
    		"happy",
    		"joy",
    		"tongue",
    		"smile",
    		"face",
    		"silly",
    		"yummy",
    		"nom",
    		"delicious",
    		"savouring"
    	],
    	char: "😋",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var relieved = {
    	keywords: [
    		"face",
    		"relaxed",
    		"phew",
    		"massage",
    		"happiness"
    	],
    	char: "😌",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var heart_eyes = {
    	keywords: [
    		"face",
    		"love",
    		"like",
    		"affection",
    		"valentines",
    		"infatuation",
    		"crush",
    		"heart"
    	],
    	char: "😍",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smiling_face_with_three_hearts = {
    	keywords: [
    		"face",
    		"love",
    		"like",
    		"affection",
    		"valentines",
    		"infatuation",
    		"crush",
    		"hearts",
    		"adore"
    	],
    	char: "🥰",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kissing_heart = {
    	keywords: [
    		"face",
    		"love",
    		"like",
    		"affection",
    		"valentines",
    		"infatuation",
    		"kiss"
    	],
    	char: "😘",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kissing = {
    	keywords: [
    		"love",
    		"like",
    		"face",
    		"3",
    		"valentines",
    		"infatuation",
    		"kiss"
    	],
    	char: "😗",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kissing_smiling_eyes = {
    	keywords: [
    		"face",
    		"affection",
    		"valentines",
    		"infatuation",
    		"kiss"
    	],
    	char: "😙",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kissing_closed_eyes = {
    	keywords: [
    		"face",
    		"love",
    		"like",
    		"affection",
    		"valentines",
    		"infatuation",
    		"kiss"
    	],
    	char: "😚",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var stuck_out_tongue_winking_eye = {
    	keywords: [
    		"face",
    		"prank",
    		"childish",
    		"playful",
    		"mischievous",
    		"smile",
    		"wink",
    		"tongue"
    	],
    	char: "😜",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var zany = {
    	keywords: [
    		"face",
    		"goofy",
    		"crazy"
    	],
    	char: "🤪",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var raised_eyebrow = {
    	keywords: [
    		"face",
    		"distrust",
    		"scepticism",
    		"disapproval",
    		"disbelief",
    		"surprise"
    	],
    	char: "🤨",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var monocle = {
    	keywords: [
    		"face",
    		"stuffy",
    		"wealthy"
    	],
    	char: "🧐",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var stuck_out_tongue_closed_eyes = {
    	keywords: [
    		"face",
    		"prank",
    		"playful",
    		"mischievous",
    		"smile",
    		"tongue"
    	],
    	char: "😝",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var stuck_out_tongue = {
    	keywords: [
    		"face",
    		"prank",
    		"childish",
    		"playful",
    		"mischievous",
    		"smile",
    		"tongue"
    	],
    	char: "😛",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var money_mouth_face = {
    	keywords: [
    		"face",
    		"rich",
    		"dollar",
    		"money"
    	],
    	char: "🤑",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var nerd_face = {
    	keywords: [
    		"face",
    		"nerdy",
    		"geek",
    		"dork"
    	],
    	char: "🤓",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sunglasses = {
    	keywords: [
    		"face",
    		"cool",
    		"smile",
    		"summer",
    		"beach",
    		"sunglass"
    	],
    	char: "😎",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var star_struck = {
    	keywords: [
    		"face",
    		"smile",
    		"starry",
    		"eyes",
    		"grinning"
    	],
    	char: "🤩",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var clown_face = {
    	keywords: [
    		"face"
    	],
    	char: "🤡",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var cowboy_hat_face = {
    	keywords: [
    		"face",
    		"cowgirl",
    		"hat"
    	],
    	char: "🤠",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var hugs = {
    	keywords: [
    		"face",
    		"smile",
    		"hug"
    	],
    	char: "🤗",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smirk = {
    	keywords: [
    		"face",
    		"smile",
    		"mean",
    		"prank",
    		"smug",
    		"sarcasm"
    	],
    	char: "😏",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var no_mouth = {
    	keywords: [
    		"face",
    		"hellokitty"
    	],
    	char: "😶",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var neutral_face = {
    	keywords: [
    		"indifference",
    		"meh",
    		":|",
    		"neutral"
    	],
    	char: "😐",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var expressionless = {
    	keywords: [
    		"face",
    		"indifferent",
    		"-_-",
    		"meh",
    		"deadpan"
    	],
    	char: "😑",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var unamused = {
    	keywords: [
    		"indifference",
    		"bored",
    		"straight face",
    		"serious",
    		"sarcasm",
    		"unimpressed",
    		"skeptical",
    		"dubious",
    		"side_eye"
    	],
    	char: "😒",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var roll_eyes = {
    	keywords: [
    		"face",
    		"eyeroll",
    		"frustrated"
    	],
    	char: "🙄",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var thinking = {
    	keywords: [
    		"face",
    		"hmmm",
    		"think",
    		"consider"
    	],
    	char: "🤔",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var lying_face = {
    	keywords: [
    		"face",
    		"lie",
    		"pinocchio"
    	],
    	char: "🤥",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var hand_over_mouth = {
    	keywords: [
    		"face",
    		"whoops",
    		"shock",
    		"surprise"
    	],
    	char: "🤭",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var shushing = {
    	keywords: [
    		"face",
    		"quiet",
    		"shhh"
    	],
    	char: "🤫",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var symbols_over_mouth = {
    	keywords: [
    		"face",
    		"swearing",
    		"cursing",
    		"cussing",
    		"profanity",
    		"expletive"
    	],
    	char: "🤬",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var exploding_head = {
    	keywords: [
    		"face",
    		"shocked",
    		"mind",
    		"blown"
    	],
    	char: "🤯",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var flushed = {
    	keywords: [
    		"face",
    		"blush",
    		"shy",
    		"flattered"
    	],
    	char: "😳",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var disappointed = {
    	keywords: [
    		"face",
    		"sad",
    		"upset",
    		"depressed",
    		":("
    	],
    	char: "😞",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var worried = {
    	keywords: [
    		"face",
    		"concern",
    		"nervous",
    		":("
    	],
    	char: "😟",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var angry = {
    	keywords: [
    		"mad",
    		"face",
    		"annoyed",
    		"frustrated"
    	],
    	char: "😠",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var rage = {
    	keywords: [
    		"angry",
    		"mad",
    		"hate",
    		"despise"
    	],
    	char: "😡",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var pensive = {
    	keywords: [
    		"face",
    		"sad",
    		"depressed",
    		"upset"
    	],
    	char: "😔",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var confused = {
    	keywords: [
    		"face",
    		"indifference",
    		"huh",
    		"weird",
    		"hmmm",
    		":/"
    	],
    	char: "😕",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var slightly_frowning_face = {
    	keywords: [
    		"face",
    		"frowning",
    		"disappointed",
    		"sad",
    		"upset"
    	],
    	char: "🙁",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var frowning_face = {
    	keywords: [
    		"face",
    		"sad",
    		"upset",
    		"frown"
    	],
    	char: "☹",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var persevere = {
    	keywords: [
    		"face",
    		"sick",
    		"no",
    		"upset",
    		"oops"
    	],
    	char: "😣",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var confounded = {
    	keywords: [
    		"face",
    		"confused",
    		"sick",
    		"unwell",
    		"oops",
    		":S"
    	],
    	char: "😖",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var tired_face = {
    	keywords: [
    		"sick",
    		"whine",
    		"upset",
    		"frustrated"
    	],
    	char: "😫",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var weary = {
    	keywords: [
    		"face",
    		"tired",
    		"sleepy",
    		"sad",
    		"frustrated",
    		"upset"
    	],
    	char: "😩",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var pleading = {
    	keywords: [
    		"face",
    		"begging",
    		"mercy"
    	],
    	char: "🥺",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var triumph = {
    	keywords: [
    		"face",
    		"gas",
    		"phew",
    		"proud",
    		"pride"
    	],
    	char: "😤",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var open_mouth = {
    	keywords: [
    		"face",
    		"surprise",
    		"impressed",
    		"wow",
    		"whoa",
    		":O"
    	],
    	char: "😮",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var scream = {
    	keywords: [
    		"face",
    		"munch",
    		"scared",
    		"omg"
    	],
    	char: "😱",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var fearful = {
    	keywords: [
    		"face",
    		"scared",
    		"terrified",
    		"nervous",
    		"oops",
    		"huh"
    	],
    	char: "😨",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var cold_sweat = {
    	keywords: [
    		"face",
    		"nervous",
    		"sweat"
    	],
    	char: "😰",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var hushed = {
    	keywords: [
    		"face",
    		"woo",
    		"shh"
    	],
    	char: "😯",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var frowning = {
    	keywords: [
    		"face",
    		"aw",
    		"what"
    	],
    	char: "😦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var anguished = {
    	keywords: [
    		"face",
    		"stunned",
    		"nervous"
    	],
    	char: "😧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var cry = {
    	keywords: [
    		"face",
    		"tears",
    		"sad",
    		"depressed",
    		"upset",
    		":'("
    	],
    	char: "😢",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var disappointed_relieved = {
    	keywords: [
    		"face",
    		"phew",
    		"sweat",
    		"nervous"
    	],
    	char: "😥",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var drooling_face = {
    	keywords: [
    		"face"
    	],
    	char: "🤤",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sleepy = {
    	keywords: [
    		"face",
    		"tired",
    		"rest",
    		"nap"
    	],
    	char: "😪",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sweat = {
    	keywords: [
    		"face",
    		"hot",
    		"sad",
    		"tired",
    		"exercise"
    	],
    	char: "😓",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var hot = {
    	keywords: [
    		"face",
    		"feverish",
    		"heat",
    		"red",
    		"sweating"
    	],
    	char: "🥵",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var cold = {
    	keywords: [
    		"face",
    		"blue",
    		"freezing",
    		"frozen",
    		"frostbite",
    		"icicles"
    	],
    	char: "🥶",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sob = {
    	keywords: [
    		"face",
    		"cry",
    		"tears",
    		"sad",
    		"upset",
    		"depressed"
    	],
    	char: "😭",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var dizzy_face = {
    	keywords: [
    		"spent",
    		"unconscious",
    		"xox",
    		"dizzy"
    	],
    	char: "😵",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var astonished = {
    	keywords: [
    		"face",
    		"xox",
    		"surprised",
    		"poisoned"
    	],
    	char: "😲",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var zipper_mouth_face = {
    	keywords: [
    		"face",
    		"sealed",
    		"zipper",
    		"secret"
    	],
    	char: "🤐",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var nauseated_face = {
    	keywords: [
    		"face",
    		"vomit",
    		"gross",
    		"green",
    		"sick",
    		"throw up",
    		"ill"
    	],
    	char: "🤢",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sneezing_face = {
    	keywords: [
    		"face",
    		"gesundheit",
    		"sneeze",
    		"sick",
    		"allergy"
    	],
    	char: "🤧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var vomiting = {
    	keywords: [
    		"face",
    		"sick"
    	],
    	char: "🤮",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var mask = {
    	keywords: [
    		"face",
    		"sick",
    		"ill",
    		"disease"
    	],
    	char: "😷",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var face_with_thermometer = {
    	keywords: [
    		"sick",
    		"temperature",
    		"thermometer",
    		"cold",
    		"fever"
    	],
    	char: "🤒",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var face_with_head_bandage = {
    	keywords: [
    		"injured",
    		"clumsy",
    		"bandage",
    		"hurt"
    	],
    	char: "🤕",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var woozy = {
    	keywords: [
    		"face",
    		"dizzy",
    		"intoxicated",
    		"tipsy",
    		"wavy"
    	],
    	char: "🥴",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sleeping = {
    	keywords: [
    		"face",
    		"tired",
    		"sleepy",
    		"night",
    		"zzz"
    	],
    	char: "😴",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var zzz = {
    	keywords: [
    		"sleepy",
    		"tired",
    		"dream"
    	],
    	char: "💤",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var poop = {
    	keywords: [
    		"hankey",
    		"shitface",
    		"fail",
    		"turd",
    		"shit"
    	],
    	char: "💩",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smiling_imp = {
    	keywords: [
    		"devil",
    		"horns"
    	],
    	char: "😈",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var imp = {
    	keywords: [
    		"devil",
    		"angry",
    		"horns"
    	],
    	char: "👿",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var japanese_ogre = {
    	keywords: [
    		"monster",
    		"red",
    		"mask",
    		"halloween",
    		"scary",
    		"creepy",
    		"devil",
    		"demon",
    		"japanese",
    		"ogre"
    	],
    	char: "👹",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var japanese_goblin = {
    	keywords: [
    		"red",
    		"evil",
    		"mask",
    		"monster",
    		"scary",
    		"creepy",
    		"japanese",
    		"goblin"
    	],
    	char: "👺",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var skull = {
    	keywords: [
    		"dead",
    		"skeleton",
    		"creepy",
    		"death"
    	],
    	char: "💀",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var ghost = {
    	keywords: [
    		"halloween",
    		"spooky",
    		"scary"
    	],
    	char: "👻",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var alien = {
    	keywords: [
    		"UFO",
    		"paul",
    		"weird",
    		"outer_space"
    	],
    	char: "👽",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var robot = {
    	keywords: [
    		"computer",
    		"machine",
    		"bot"
    	],
    	char: "🤖",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smiley_cat = {
    	keywords: [
    		"animal",
    		"cats",
    		"happy",
    		"smile"
    	],
    	char: "😺",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smile_cat = {
    	keywords: [
    		"animal",
    		"cats",
    		"smile"
    	],
    	char: "😸",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var joy_cat = {
    	keywords: [
    		"animal",
    		"cats",
    		"haha",
    		"happy",
    		"tears"
    	],
    	char: "😹",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var heart_eyes_cat = {
    	keywords: [
    		"animal",
    		"love",
    		"like",
    		"affection",
    		"cats",
    		"valentines",
    		"heart"
    	],
    	char: "😻",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var smirk_cat = {
    	keywords: [
    		"animal",
    		"cats",
    		"smirk"
    	],
    	char: "😼",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kissing_cat = {
    	keywords: [
    		"animal",
    		"cats",
    		"kiss"
    	],
    	char: "😽",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var scream_cat = {
    	keywords: [
    		"animal",
    		"cats",
    		"munch",
    		"scared",
    		"scream"
    	],
    	char: "🙀",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var crying_cat_face = {
    	keywords: [
    		"animal",
    		"tears",
    		"weep",
    		"sad",
    		"cats",
    		"upset",
    		"cry"
    	],
    	char: "😿",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var pouting_cat = {
    	keywords: [
    		"animal",
    		"cats"
    	],
    	char: "😾",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var palms_up = {
    	keywords: [
    		"hands",
    		"gesture",
    		"cupped",
    		"prayer"
    	],
    	char: "🤲",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var raised_hands = {
    	keywords: [
    		"gesture",
    		"hooray",
    		"yea",
    		"celebration",
    		"hands"
    	],
    	char: "🙌",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var clap = {
    	keywords: [
    		"hands",
    		"praise",
    		"applause",
    		"congrats",
    		"yay"
    	],
    	char: "👏",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var wave = {
    	keywords: [
    		"hands",
    		"gesture",
    		"goodbye",
    		"solong",
    		"farewell",
    		"hello",
    		"hi",
    		"palm"
    	],
    	char: "👋",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var call_me_hand = {
    	keywords: [
    		"hands",
    		"gesture"
    	],
    	char: "🤙",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var facepunch = {
    	keywords: [
    		"angry",
    		"violence",
    		"fist",
    		"hit",
    		"attack",
    		"hand"
    	],
    	char: "👊",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var fist = {
    	keywords: [
    		"fingers",
    		"hand",
    		"grasp"
    	],
    	char: "✊",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var fist_left = {
    	keywords: [
    		"hand",
    		"fistbump"
    	],
    	char: "🤛",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var fist_right = {
    	keywords: [
    		"hand",
    		"fistbump"
    	],
    	char: "🤜",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var v = {
    	keywords: [
    		"fingers",
    		"ohyeah",
    		"hand",
    		"peace",
    		"victory",
    		"two"
    	],
    	char: "✌",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var ok_hand = {
    	keywords: [
    		"fingers",
    		"limbs",
    		"perfect",
    		"ok",
    		"okay"
    	],
    	char: "👌",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var raised_hand = {
    	keywords: [
    		"fingers",
    		"stop",
    		"highfive",
    		"palm",
    		"ban"
    	],
    	char: "✋",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var raised_back_of_hand = {
    	keywords: [
    		"fingers",
    		"raised",
    		"backhand"
    	],
    	char: "🤚",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var open_hands = {
    	keywords: [
    		"fingers",
    		"butterfly",
    		"hands",
    		"open"
    	],
    	char: "👐",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var muscle = {
    	keywords: [
    		"arm",
    		"flex",
    		"hand",
    		"summer",
    		"strong",
    		"biceps"
    	],
    	char: "💪",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var pray = {
    	keywords: [
    		"please",
    		"hope",
    		"wish",
    		"namaste",
    		"highfive"
    	],
    	char: "🙏",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var foot = {
    	keywords: [
    		"kick",
    		"stomp"
    	],
    	char: "🦶",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var leg = {
    	keywords: [
    		"kick",
    		"limb"
    	],
    	char: "🦵",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var handshake = {
    	keywords: [
    		"agreement",
    		"shake"
    	],
    	char: "🤝",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var point_up = {
    	keywords: [
    		"hand",
    		"fingers",
    		"direction",
    		"up"
    	],
    	char: "☝",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var point_up_2 = {
    	keywords: [
    		"fingers",
    		"hand",
    		"direction",
    		"up"
    	],
    	char: "👆",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var point_down = {
    	keywords: [
    		"fingers",
    		"hand",
    		"direction",
    		"down"
    	],
    	char: "👇",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var point_left = {
    	keywords: [
    		"direction",
    		"fingers",
    		"hand",
    		"left"
    	],
    	char: "👈",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var point_right = {
    	keywords: [
    		"fingers",
    		"hand",
    		"direction",
    		"right"
    	],
    	char: "👉",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var fu = {
    	keywords: [
    		"hand",
    		"fingers",
    		"rude",
    		"middle",
    		"flipping"
    	],
    	char: "🖕",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var raised_hand_with_fingers_splayed = {
    	keywords: [
    		"hand",
    		"fingers",
    		"palm"
    	],
    	char: "🖐",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var love_you = {
    	keywords: [
    		"hand",
    		"fingers",
    		"gesture"
    	],
    	char: "🤟",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var metal = {
    	keywords: [
    		"hand",
    		"fingers",
    		"evil_eye",
    		"sign_of_horns",
    		"rock_on"
    	],
    	char: "🤘",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var crossed_fingers = {
    	keywords: [
    		"good",
    		"lucky"
    	],
    	char: "🤞",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var vulcan_salute = {
    	keywords: [
    		"hand",
    		"fingers",
    		"spock",
    		"star trek"
    	],
    	char: "🖖",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var writing_hand = {
    	keywords: [
    		"lower_left_ballpoint_pen",
    		"stationery",
    		"write",
    		"compose"
    	],
    	char: "✍",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var selfie = {
    	keywords: [
    		"camera",
    		"phone"
    	],
    	char: "🤳",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var nail_care = {
    	keywords: [
    		"beauty",
    		"manicure",
    		"finger",
    		"fashion",
    		"nail"
    	],
    	char: "💅",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var lips = {
    	keywords: [
    		"mouth",
    		"kiss"
    	],
    	char: "👄",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var tooth = {
    	keywords: [
    		"teeth",
    		"dentist"
    	],
    	char: "🦷",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var tongue = {
    	keywords: [
    		"mouth",
    		"playful"
    	],
    	char: "👅",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var ear = {
    	keywords: [
    		"face",
    		"hear",
    		"sound",
    		"listen"
    	],
    	char: "👂",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var nose = {
    	keywords: [
    		"smell",
    		"sniff"
    	],
    	char: "👃",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var eye = {
    	keywords: [
    		"face",
    		"look",
    		"see",
    		"watch",
    		"stare"
    	],
    	char: "👁",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var eyes = {
    	keywords: [
    		"look",
    		"watch",
    		"stalk",
    		"peek",
    		"see"
    	],
    	char: "👀",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var brain = {
    	keywords: [
    		"smart",
    		"intelligent"
    	],
    	char: "🧠",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var bust_in_silhouette = {
    	keywords: [
    		"user",
    		"person",
    		"human"
    	],
    	char: "👤",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var busts_in_silhouette = {
    	keywords: [
    		"user",
    		"person",
    		"human",
    		"group",
    		"team"
    	],
    	char: "👥",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var speaking_head = {
    	keywords: [
    		"user",
    		"person",
    		"human",
    		"sing",
    		"say",
    		"talk"
    	],
    	char: "🗣",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var baby = {
    	keywords: [
    		"child",
    		"boy",
    		"girl",
    		"toddler"
    	],
    	char: "👶",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var child = {
    	keywords: [
    		"gender-neutral",
    		"young"
    	],
    	char: "🧒",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var boy = {
    	keywords: [
    		"man",
    		"male",
    		"guy",
    		"teenager"
    	],
    	char: "👦",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var girl = {
    	keywords: [
    		"female",
    		"woman",
    		"teenager"
    	],
    	char: "👧",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var adult = {
    	keywords: [
    		"gender-neutral",
    		"person"
    	],
    	char: "🧑",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man = {
    	keywords: [
    		"mustache",
    		"father",
    		"dad",
    		"guy",
    		"classy",
    		"sir",
    		"moustache"
    	],
    	char: "👨",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman = {
    	keywords: [
    		"female",
    		"girls",
    		"lady"
    	],
    	char: "👩",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var blonde_woman = {
    	keywords: [
    		"woman",
    		"female",
    		"girl",
    		"blonde",
    		"person"
    	],
    	char: "👱‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var blonde_man = {
    	keywords: [
    		"man",
    		"male",
    		"boy",
    		"blonde",
    		"guy",
    		"person"
    	],
    	char: "👱",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var bearded_person = {
    	keywords: [
    		"person",
    		"bewhiskered"
    	],
    	char: "🧔",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var older_adult = {
    	keywords: [
    		"human",
    		"elder",
    		"senior",
    		"gender-neutral"
    	],
    	char: "🧓",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var older_man = {
    	keywords: [
    		"human",
    		"male",
    		"men",
    		"old",
    		"elder",
    		"senior"
    	],
    	char: "👴",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var older_woman = {
    	keywords: [
    		"human",
    		"female",
    		"women",
    		"lady",
    		"old",
    		"elder",
    		"senior"
    	],
    	char: "👵",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_with_gua_pi_mao = {
    	keywords: [
    		"male",
    		"boy",
    		"chinese"
    	],
    	char: "👲",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_with_headscarf = {
    	keywords: [
    		"female",
    		"hijab",
    		"mantilla",
    		"tichel"
    	],
    	char: "🧕",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_with_turban = {
    	keywords: [
    		"female",
    		"indian",
    		"hinduism",
    		"arabs",
    		"woman"
    	],
    	char: "👳‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_with_turban = {
    	keywords: [
    		"male",
    		"indian",
    		"hinduism",
    		"arabs"
    	],
    	char: "👳",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var policewoman = {
    	keywords: [
    		"woman",
    		"police",
    		"law",
    		"legal",
    		"enforcement",
    		"arrest",
    		"911",
    		"female"
    	],
    	char: "👮‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var policeman = {
    	keywords: [
    		"man",
    		"police",
    		"law",
    		"legal",
    		"enforcement",
    		"arrest",
    		"911"
    	],
    	char: "👮",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var construction_worker_woman = {
    	keywords: [
    		"female",
    		"human",
    		"wip",
    		"build",
    		"construction",
    		"worker",
    		"labor",
    		"woman"
    	],
    	char: "👷‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var construction_worker_man = {
    	keywords: [
    		"male",
    		"human",
    		"wip",
    		"guy",
    		"build",
    		"construction",
    		"worker",
    		"labor"
    	],
    	char: "👷",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var guardswoman = {
    	keywords: [
    		"uk",
    		"gb",
    		"british",
    		"female",
    		"royal",
    		"woman"
    	],
    	char: "💂‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var guardsman = {
    	keywords: [
    		"uk",
    		"gb",
    		"british",
    		"male",
    		"guy",
    		"royal"
    	],
    	char: "💂",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var female_detective = {
    	keywords: [
    		"human",
    		"spy",
    		"detective",
    		"female",
    		"woman"
    	],
    	char: "🕵️‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var male_detective = {
    	keywords: [
    		"human",
    		"spy",
    		"detective"
    	],
    	char: "🕵",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_health_worker = {
    	keywords: [
    		"doctor",
    		"nurse",
    		"therapist",
    		"healthcare",
    		"woman",
    		"human"
    	],
    	char: "👩‍⚕️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_health_worker = {
    	keywords: [
    		"doctor",
    		"nurse",
    		"therapist",
    		"healthcare",
    		"man",
    		"human"
    	],
    	char: "👨‍⚕️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_farmer = {
    	keywords: [
    		"rancher",
    		"gardener",
    		"woman",
    		"human"
    	],
    	char: "👩‍🌾",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_farmer = {
    	keywords: [
    		"rancher",
    		"gardener",
    		"man",
    		"human"
    	],
    	char: "👨‍🌾",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_cook = {
    	keywords: [
    		"chef",
    		"woman",
    		"human"
    	],
    	char: "👩‍🍳",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_cook = {
    	keywords: [
    		"chef",
    		"man",
    		"human"
    	],
    	char: "👨‍🍳",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_student = {
    	keywords: [
    		"graduate",
    		"woman",
    		"human"
    	],
    	char: "👩‍🎓",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_student = {
    	keywords: [
    		"graduate",
    		"man",
    		"human"
    	],
    	char: "👨‍🎓",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_singer = {
    	keywords: [
    		"rockstar",
    		"entertainer",
    		"woman",
    		"human"
    	],
    	char: "👩‍🎤",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_singer = {
    	keywords: [
    		"rockstar",
    		"entertainer",
    		"man",
    		"human"
    	],
    	char: "👨‍🎤",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_teacher = {
    	keywords: [
    		"instructor",
    		"professor",
    		"woman",
    		"human"
    	],
    	char: "👩‍🏫",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_teacher = {
    	keywords: [
    		"instructor",
    		"professor",
    		"man",
    		"human"
    	],
    	char: "👨‍🏫",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_factory_worker = {
    	keywords: [
    		"assembly",
    		"industrial",
    		"woman",
    		"human"
    	],
    	char: "👩‍🏭",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_factory_worker = {
    	keywords: [
    		"assembly",
    		"industrial",
    		"man",
    		"human"
    	],
    	char: "👨‍🏭",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_technologist = {
    	keywords: [
    		"coder",
    		"developer",
    		"engineer",
    		"programmer",
    		"software",
    		"woman",
    		"human",
    		"laptop",
    		"computer"
    	],
    	char: "👩‍💻",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_technologist = {
    	keywords: [
    		"coder",
    		"developer",
    		"engineer",
    		"programmer",
    		"software",
    		"man",
    		"human",
    		"laptop",
    		"computer"
    	],
    	char: "👨‍💻",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_office_worker = {
    	keywords: [
    		"business",
    		"manager",
    		"woman",
    		"human"
    	],
    	char: "👩‍💼",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_office_worker = {
    	keywords: [
    		"business",
    		"manager",
    		"man",
    		"human"
    	],
    	char: "👨‍💼",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_mechanic = {
    	keywords: [
    		"plumber",
    		"woman",
    		"human",
    		"wrench"
    	],
    	char: "👩‍🔧",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_mechanic = {
    	keywords: [
    		"plumber",
    		"man",
    		"human",
    		"wrench"
    	],
    	char: "👨‍🔧",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_scientist = {
    	keywords: [
    		"biologist",
    		"chemist",
    		"engineer",
    		"physicist",
    		"woman",
    		"human"
    	],
    	char: "👩‍🔬",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_scientist = {
    	keywords: [
    		"biologist",
    		"chemist",
    		"engineer",
    		"physicist",
    		"man",
    		"human"
    	],
    	char: "👨‍🔬",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_artist = {
    	keywords: [
    		"painter",
    		"woman",
    		"human"
    	],
    	char: "👩‍🎨",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_artist = {
    	keywords: [
    		"painter",
    		"man",
    		"human"
    	],
    	char: "👨‍🎨",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_firefighter = {
    	keywords: [
    		"fireman",
    		"woman",
    		"human"
    	],
    	char: "👩‍🚒",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_firefighter = {
    	keywords: [
    		"fireman",
    		"man",
    		"human"
    	],
    	char: "👨‍🚒",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_pilot = {
    	keywords: [
    		"aviator",
    		"plane",
    		"woman",
    		"human"
    	],
    	char: "👩‍✈️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_pilot = {
    	keywords: [
    		"aviator",
    		"plane",
    		"man",
    		"human"
    	],
    	char: "👨‍✈️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_astronaut = {
    	keywords: [
    		"space",
    		"rocket",
    		"woman",
    		"human"
    	],
    	char: "👩‍🚀",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_astronaut = {
    	keywords: [
    		"space",
    		"rocket",
    		"man",
    		"human"
    	],
    	char: "👨‍🚀",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_judge = {
    	keywords: [
    		"justice",
    		"court",
    		"woman",
    		"human"
    	],
    	char: "👩‍⚖️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_judge = {
    	keywords: [
    		"justice",
    		"court",
    		"man",
    		"human"
    	],
    	char: "👨‍⚖️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_superhero = {
    	keywords: [
    		"woman",
    		"female",
    		"good",
    		"heroine",
    		"superpowers"
    	],
    	char: "🦸‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_superhero = {
    	keywords: [
    		"man",
    		"male",
    		"good",
    		"hero",
    		"superpowers"
    	],
    	char: "🦸‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_supervillain = {
    	keywords: [
    		"woman",
    		"female",
    		"evil",
    		"bad",
    		"criminal",
    		"heroine",
    		"superpowers"
    	],
    	char: "🦹‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_supervillain = {
    	keywords: [
    		"man",
    		"male",
    		"evil",
    		"bad",
    		"criminal",
    		"hero",
    		"superpowers"
    	],
    	char: "🦹‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var mrs_claus = {
    	keywords: [
    		"woman",
    		"female",
    		"xmas",
    		"mother christmas"
    	],
    	char: "🤶",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var santa = {
    	keywords: [
    		"festival",
    		"man",
    		"male",
    		"xmas",
    		"father christmas"
    	],
    	char: "🎅",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var sorceress = {
    	keywords: [
    		"woman",
    		"female",
    		"mage",
    		"witch"
    	],
    	char: "🧙‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var wizard = {
    	keywords: [
    		"man",
    		"male",
    		"mage",
    		"sorcerer"
    	],
    	char: "🧙‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_elf = {
    	keywords: [
    		"woman",
    		"female"
    	],
    	char: "🧝‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_elf = {
    	keywords: [
    		"man",
    		"male"
    	],
    	char: "🧝‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_vampire = {
    	keywords: [
    		"woman",
    		"female"
    	],
    	char: "🧛‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_vampire = {
    	keywords: [
    		"man",
    		"male",
    		"dracula"
    	],
    	char: "🧛‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_zombie = {
    	keywords: [
    		"woman",
    		"female",
    		"undead",
    		"walking dead"
    	],
    	char: "🧟‍♀️",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var man_zombie = {
    	keywords: [
    		"man",
    		"male",
    		"dracula",
    		"undead",
    		"walking dead"
    	],
    	char: "🧟‍♂️",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var woman_genie = {
    	keywords: [
    		"woman",
    		"female"
    	],
    	char: "🧞‍♀️",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var man_genie = {
    	keywords: [
    		"man",
    		"male"
    	],
    	char: "🧞‍♂️",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var mermaid = {
    	keywords: [
    		"woman",
    		"female",
    		"merwoman",
    		"ariel"
    	],
    	char: "🧜‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var merman = {
    	keywords: [
    		"man",
    		"male",
    		"triton"
    	],
    	char: "🧜‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_fairy = {
    	keywords: [
    		"woman",
    		"female"
    	],
    	char: "🧚‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_fairy = {
    	keywords: [
    		"man",
    		"male"
    	],
    	char: "🧚‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var angel = {
    	keywords: [
    		"heaven",
    		"wings",
    		"halo"
    	],
    	char: "👼",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var pregnant_woman = {
    	keywords: [
    		"baby"
    	],
    	char: "🤰",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var breastfeeding = {
    	keywords: [
    		"nursing",
    		"baby"
    	],
    	char: "🤱",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var princess = {
    	keywords: [
    		"girl",
    		"woman",
    		"female",
    		"blond",
    		"crown",
    		"royal",
    		"queen"
    	],
    	char: "👸",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var prince = {
    	keywords: [
    		"boy",
    		"man",
    		"male",
    		"crown",
    		"royal",
    		"king"
    	],
    	char: "🤴",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var bride_with_veil = {
    	keywords: [
    		"couple",
    		"marriage",
    		"wedding",
    		"woman",
    		"bride"
    	],
    	char: "👰",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_in_tuxedo = {
    	keywords: [
    		"couple",
    		"marriage",
    		"wedding",
    		"groom"
    	],
    	char: "🤵",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var running_woman = {
    	keywords: [
    		"woman",
    		"walking",
    		"exercise",
    		"race",
    		"running",
    		"female"
    	],
    	char: "🏃‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var running_man = {
    	keywords: [
    		"man",
    		"walking",
    		"exercise",
    		"race",
    		"running"
    	],
    	char: "🏃",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var walking_woman = {
    	keywords: [
    		"human",
    		"feet",
    		"steps",
    		"woman",
    		"female"
    	],
    	char: "🚶‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var walking_man = {
    	keywords: [
    		"human",
    		"feet",
    		"steps"
    	],
    	char: "🚶",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var dancer = {
    	keywords: [
    		"female",
    		"girl",
    		"woman",
    		"fun"
    	],
    	char: "💃",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_dancing = {
    	keywords: [
    		"male",
    		"boy",
    		"fun",
    		"dancer"
    	],
    	char: "🕺",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var dancing_women = {
    	keywords: [
    		"female",
    		"bunny",
    		"women",
    		"girls"
    	],
    	char: "👯",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var dancing_men = {
    	keywords: [
    		"male",
    		"bunny",
    		"men",
    		"boys"
    	],
    	char: "👯‍♂️",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var couple = {
    	keywords: [
    		"pair",
    		"people",
    		"human",
    		"love",
    		"date",
    		"dating",
    		"like",
    		"affection",
    		"valentines",
    		"marriage"
    	],
    	char: "👫",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var two_men_holding_hands = {
    	keywords: [
    		"pair",
    		"couple",
    		"love",
    		"like",
    		"bromance",
    		"friendship",
    		"people",
    		"human"
    	],
    	char: "👬",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var two_women_holding_hands = {
    	keywords: [
    		"pair",
    		"friendship",
    		"couple",
    		"love",
    		"like",
    		"female",
    		"people",
    		"human"
    	],
    	char: "👭",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var bowing_woman = {
    	keywords: [
    		"woman",
    		"female",
    		"girl"
    	],
    	char: "🙇‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var bowing_man = {
    	keywords: [
    		"man",
    		"male",
    		"boy"
    	],
    	char: "🙇",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_facepalming = {
    	keywords: [
    		"man",
    		"male",
    		"boy",
    		"disbelief"
    	],
    	char: "🤦‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_facepalming = {
    	keywords: [
    		"woman",
    		"female",
    		"girl",
    		"disbelief"
    	],
    	char: "🤦‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_shrugging = {
    	keywords: [
    		"woman",
    		"female",
    		"girl",
    		"confused",
    		"indifferent",
    		"doubt"
    	],
    	char: "🤷",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_shrugging = {
    	keywords: [
    		"man",
    		"male",
    		"boy",
    		"confused",
    		"indifferent",
    		"doubt"
    	],
    	char: "🤷‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var tipping_hand_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman",
    		"human",
    		"information"
    	],
    	char: "💁",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var tipping_hand_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man",
    		"human",
    		"information"
    	],
    	char: "💁‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var no_good_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman",
    		"nope"
    	],
    	char: "🙅",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var no_good_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man",
    		"nope"
    	],
    	char: "🙅‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var ok_woman = {
    	keywords: [
    		"women",
    		"girl",
    		"female",
    		"pink",
    		"human",
    		"woman"
    	],
    	char: "🙆",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var ok_man = {
    	keywords: [
    		"men",
    		"boy",
    		"male",
    		"blue",
    		"human",
    		"man"
    	],
    	char: "🙆‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var raising_hand_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman"
    	],
    	char: "🙋",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var raising_hand_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man"
    	],
    	char: "🙋‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var pouting_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman"
    	],
    	char: "🙎",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var pouting_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man"
    	],
    	char: "🙎‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var frowning_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman",
    		"sad",
    		"depressed",
    		"discouraged",
    		"unhappy"
    	],
    	char: "🙍",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var frowning_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man",
    		"sad",
    		"depressed",
    		"discouraged",
    		"unhappy"
    	],
    	char: "🙍‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var haircut_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman"
    	],
    	char: "💇",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var haircut_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man"
    	],
    	char: "💇‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var massage_woman = {
    	keywords: [
    		"female",
    		"girl",
    		"woman",
    		"head"
    	],
    	char: "💆",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var massage_man = {
    	keywords: [
    		"male",
    		"boy",
    		"man",
    		"head"
    	],
    	char: "💆‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var woman_in_steamy_room = {
    	keywords: [
    		"female",
    		"woman",
    		"spa",
    		"steamroom",
    		"sauna"
    	],
    	char: "🧖‍♀️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var man_in_steamy_room = {
    	keywords: [
    		"male",
    		"man",
    		"spa",
    		"steamroom",
    		"sauna"
    	],
    	char: "🧖‍♂️",
    	fitzpatrick_scale: true,
    	category: "people"
    };
    var couple_with_heart_woman_man = {
    	keywords: [
    		"pair",
    		"love",
    		"like",
    		"affection",
    		"human",
    		"dating",
    		"valentines",
    		"marriage"
    	],
    	char: "💑",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var couple_with_heart_woman_woman = {
    	keywords: [
    		"pair",
    		"love",
    		"like",
    		"affection",
    		"human",
    		"dating",
    		"valentines",
    		"marriage"
    	],
    	char: "👩‍❤️‍👩",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var couple_with_heart_man_man = {
    	keywords: [
    		"pair",
    		"love",
    		"like",
    		"affection",
    		"human",
    		"dating",
    		"valentines",
    		"marriage"
    	],
    	char: "👨‍❤️‍👨",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var couplekiss_man_woman = {
    	keywords: [
    		"pair",
    		"valentines",
    		"love",
    		"like",
    		"dating",
    		"marriage"
    	],
    	char: "💏",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var couplekiss_woman_woman = {
    	keywords: [
    		"pair",
    		"valentines",
    		"love",
    		"like",
    		"dating",
    		"marriage"
    	],
    	char: "👩‍❤️‍💋‍👩",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var couplekiss_man_man = {
    	keywords: [
    		"pair",
    		"valentines",
    		"love",
    		"like",
    		"dating",
    		"marriage"
    	],
    	char: "👨‍❤️‍💋‍👨",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_woman_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"child",
    		"mom",
    		"dad",
    		"father",
    		"mother",
    		"people",
    		"human"
    	],
    	char: "👪",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_woman_girl = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"child"
    	],
    	char: "👨‍👩‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_woman_girl_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👩‍👧‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_woman_boy_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👩‍👦‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_woman_girl_girl = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👩‍👧‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_woman_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👩‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_woman_girl = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👩‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_woman_girl_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👩‍👧‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_woman_boy_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👩‍👦‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_woman_girl_girl = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👩‍👧‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_man_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👨‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_man_girl = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👨‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_man_girl_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👨‍👧‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_man_boy_boy = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👨‍👦‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_man_girl_girl = {
    	keywords: [
    		"home",
    		"parents",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👨‍👧‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_boy = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"child"
    	],
    	char: "👩‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_girl = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"child"
    	],
    	char: "👩‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_girl_boy = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👧‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_boy_boy = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👦‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_woman_girl_girl = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👩‍👧‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_boy = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"child"
    	],
    	char: "👨‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_girl = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"child"
    	],
    	char: "👨‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_girl_boy = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👧‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_boy_boy = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👦‍👦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var family_man_girl_girl = {
    	keywords: [
    		"home",
    		"parent",
    		"people",
    		"human",
    		"children"
    	],
    	char: "👨‍👧‍👧",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var yarn = {
    	keywords: [
    		"ball",
    		"crochet",
    		"knit"
    	],
    	char: "🧶",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var thread = {
    	keywords: [
    		"needle",
    		"sewing",
    		"spool",
    		"string"
    	],
    	char: "🧵",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var coat = {
    	keywords: [
    		"jacket"
    	],
    	char: "🧥",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var labcoat = {
    	keywords: [
    		"doctor",
    		"experiment",
    		"scientist",
    		"chemist"
    	],
    	char: "🥼",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var womans_clothes = {
    	keywords: [
    		"fashion",
    		"shopping_bags",
    		"female"
    	],
    	char: "👚",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var tshirt = {
    	keywords: [
    		"fashion",
    		"cloth",
    		"casual",
    		"shirt",
    		"tee"
    	],
    	char: "👕",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var jeans = {
    	keywords: [
    		"fashion",
    		"shopping"
    	],
    	char: "👖",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var necktie = {
    	keywords: [
    		"shirt",
    		"suitup",
    		"formal",
    		"fashion",
    		"cloth",
    		"business"
    	],
    	char: "👔",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var dress = {
    	keywords: [
    		"clothes",
    		"fashion",
    		"shopping"
    	],
    	char: "👗",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var bikini = {
    	keywords: [
    		"swimming",
    		"female",
    		"woman",
    		"girl",
    		"fashion",
    		"beach",
    		"summer"
    	],
    	char: "👙",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kimono = {
    	keywords: [
    		"dress",
    		"fashion",
    		"women",
    		"female",
    		"japanese"
    	],
    	char: "👘",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var lipstick = {
    	keywords: [
    		"female",
    		"girl",
    		"fashion",
    		"woman"
    	],
    	char: "💄",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var kiss = {
    	keywords: [
    		"face",
    		"lips",
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💋",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var footprints = {
    	keywords: [
    		"feet",
    		"tracking",
    		"walking",
    		"beach"
    	],
    	char: "👣",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var flat_shoe = {
    	keywords: [
    		"ballet",
    		"slip-on",
    		"slipper"
    	],
    	char: "🥿",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var high_heel = {
    	keywords: [
    		"fashion",
    		"shoes",
    		"female",
    		"pumps",
    		"stiletto"
    	],
    	char: "👠",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var sandal = {
    	keywords: [
    		"shoes",
    		"fashion",
    		"flip flops"
    	],
    	char: "👡",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var boot = {
    	keywords: [
    		"shoes",
    		"fashion"
    	],
    	char: "👢",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var mans_shoe = {
    	keywords: [
    		"fashion",
    		"male"
    	],
    	char: "👞",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var athletic_shoe = {
    	keywords: [
    		"shoes",
    		"sports",
    		"sneakers"
    	],
    	char: "👟",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var hiking_boot = {
    	keywords: [
    		"backpacking",
    		"camping",
    		"hiking"
    	],
    	char: "🥾",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var socks = {
    	keywords: [
    		"stockings",
    		"clothes"
    	],
    	char: "🧦",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var gloves = {
    	keywords: [
    		"hands",
    		"winter",
    		"clothes"
    	],
    	char: "🧤",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var scarf = {
    	keywords: [
    		"neck",
    		"winter",
    		"clothes"
    	],
    	char: "🧣",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var womans_hat = {
    	keywords: [
    		"fashion",
    		"accessories",
    		"female",
    		"lady",
    		"spring"
    	],
    	char: "👒",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var tophat = {
    	keywords: [
    		"magic",
    		"gentleman",
    		"classy",
    		"circus"
    	],
    	char: "🎩",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var billed_hat = {
    	keywords: [
    		"cap",
    		"baseball"
    	],
    	char: "🧢",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var rescue_worker_helmet = {
    	keywords: [
    		"construction",
    		"build"
    	],
    	char: "⛑",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var mortar_board = {
    	keywords: [
    		"school",
    		"college",
    		"degree",
    		"university",
    		"graduation",
    		"cap",
    		"hat",
    		"legal",
    		"learn",
    		"education"
    	],
    	char: "🎓",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var crown = {
    	keywords: [
    		"king",
    		"kod",
    		"leader",
    		"royalty",
    		"lord"
    	],
    	char: "👑",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var school_satchel = {
    	keywords: [
    		"student",
    		"education",
    		"bag",
    		"backpack"
    	],
    	char: "🎒",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var luggage = {
    	keywords: [
    		"packing",
    		"travel"
    	],
    	char: "🧳",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var pouch = {
    	keywords: [
    		"bag",
    		"accessories",
    		"shopping"
    	],
    	char: "👝",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var purse = {
    	keywords: [
    		"fashion",
    		"accessories",
    		"money",
    		"sales",
    		"shopping"
    	],
    	char: "👛",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var handbag = {
    	keywords: [
    		"fashion",
    		"accessory",
    		"accessories",
    		"shopping"
    	],
    	char: "👜",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var briefcase = {
    	keywords: [
    		"business",
    		"documents",
    		"work",
    		"law",
    		"legal",
    		"job",
    		"career"
    	],
    	char: "💼",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var eyeglasses = {
    	keywords: [
    		"fashion",
    		"accessories",
    		"eyesight",
    		"nerdy",
    		"dork",
    		"geek"
    	],
    	char: "👓",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var dark_sunglasses = {
    	keywords: [
    		"face",
    		"cool",
    		"accessories"
    	],
    	char: "🕶",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var goggles = {
    	keywords: [
    		"eyes",
    		"protection",
    		"safety"
    	],
    	char: "🥽",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var ring = {
    	keywords: [
    		"wedding",
    		"propose",
    		"marriage",
    		"valentines",
    		"diamond",
    		"fashion",
    		"jewelry",
    		"gem",
    		"engagement"
    	],
    	char: "💍",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var closed_umbrella = {
    	keywords: [
    		"weather",
    		"rain",
    		"drizzle"
    	],
    	char: "🌂",
    	fitzpatrick_scale: false,
    	category: "people"
    };
    var dog = {
    	keywords: [
    		"animal",
    		"friend",
    		"nature",
    		"woof",
    		"puppy",
    		"pet",
    		"faithful"
    	],
    	char: "🐶",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cat = {
    	keywords: [
    		"animal",
    		"meow",
    		"nature",
    		"pet",
    		"kitten"
    	],
    	char: "🐱",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var mouse = {
    	keywords: [
    		"animal",
    		"nature",
    		"cheese_wedge",
    		"rodent"
    	],
    	char: "🐭",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hamster = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐹",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var rabbit = {
    	keywords: [
    		"animal",
    		"nature",
    		"pet",
    		"spring",
    		"magic",
    		"bunny"
    	],
    	char: "🐰",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var fox_face = {
    	keywords: [
    		"animal",
    		"nature",
    		"face"
    	],
    	char: "🦊",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var bear = {
    	keywords: [
    		"animal",
    		"nature",
    		"wild"
    	],
    	char: "🐻",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var panda_face = {
    	keywords: [
    		"animal",
    		"nature",
    		"panda"
    	],
    	char: "🐼",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var koala = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐨",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var tiger = {
    	keywords: [
    		"animal",
    		"cat",
    		"danger",
    		"wild",
    		"nature",
    		"roar"
    	],
    	char: "🐯",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var lion = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🦁",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cow = {
    	keywords: [
    		"beef",
    		"ox",
    		"animal",
    		"nature",
    		"moo",
    		"milk"
    	],
    	char: "🐮",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var pig = {
    	keywords: [
    		"animal",
    		"oink",
    		"nature"
    	],
    	char: "🐷",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var pig_nose = {
    	keywords: [
    		"animal",
    		"oink"
    	],
    	char: "🐽",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var frog = {
    	keywords: [
    		"animal",
    		"nature",
    		"croak",
    		"toad"
    	],
    	char: "🐸",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var squid = {
    	keywords: [
    		"animal",
    		"nature",
    		"ocean",
    		"sea"
    	],
    	char: "🦑",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var octopus = {
    	keywords: [
    		"animal",
    		"creature",
    		"ocean",
    		"sea",
    		"nature",
    		"beach"
    	],
    	char: "🐙",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var shrimp = {
    	keywords: [
    		"animal",
    		"ocean",
    		"nature",
    		"seafood"
    	],
    	char: "🦐",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var monkey_face = {
    	keywords: [
    		"animal",
    		"nature",
    		"circus"
    	],
    	char: "🐵",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var gorilla = {
    	keywords: [
    		"animal",
    		"nature",
    		"circus"
    	],
    	char: "🦍",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var see_no_evil = {
    	keywords: [
    		"monkey",
    		"animal",
    		"nature",
    		"haha"
    	],
    	char: "🙈",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hear_no_evil = {
    	keywords: [
    		"animal",
    		"monkey",
    		"nature"
    	],
    	char: "🙉",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var speak_no_evil = {
    	keywords: [
    		"monkey",
    		"animal",
    		"nature",
    		"omg"
    	],
    	char: "🙊",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var monkey = {
    	keywords: [
    		"animal",
    		"nature",
    		"banana",
    		"circus"
    	],
    	char: "🐒",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var chicken = {
    	keywords: [
    		"animal",
    		"cluck",
    		"nature",
    		"bird"
    	],
    	char: "🐔",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var penguin = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐧",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var bird = {
    	keywords: [
    		"animal",
    		"nature",
    		"fly",
    		"tweet",
    		"spring"
    	],
    	char: "🐦",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var baby_chick = {
    	keywords: [
    		"animal",
    		"chicken",
    		"bird"
    	],
    	char: "🐤",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hatching_chick = {
    	keywords: [
    		"animal",
    		"chicken",
    		"egg",
    		"born",
    		"baby",
    		"bird"
    	],
    	char: "🐣",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hatched_chick = {
    	keywords: [
    		"animal",
    		"chicken",
    		"baby",
    		"bird"
    	],
    	char: "🐥",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var duck = {
    	keywords: [
    		"animal",
    		"nature",
    		"bird",
    		"mallard"
    	],
    	char: "🦆",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var eagle = {
    	keywords: [
    		"animal",
    		"nature",
    		"bird"
    	],
    	char: "🦅",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var owl = {
    	keywords: [
    		"animal",
    		"nature",
    		"bird",
    		"hoot"
    	],
    	char: "🦉",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var bat = {
    	keywords: [
    		"animal",
    		"nature",
    		"blind",
    		"vampire"
    	],
    	char: "🦇",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var wolf = {
    	keywords: [
    		"animal",
    		"nature",
    		"wild"
    	],
    	char: "🐺",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var boar = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐗",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var horse = {
    	keywords: [
    		"animal",
    		"brown",
    		"nature"
    	],
    	char: "🐴",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var unicorn = {
    	keywords: [
    		"animal",
    		"nature",
    		"mystical"
    	],
    	char: "🦄",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var honeybee = {
    	keywords: [
    		"animal",
    		"insect",
    		"nature",
    		"bug",
    		"spring",
    		"honey"
    	],
    	char: "🐝",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var bug = {
    	keywords: [
    		"animal",
    		"insect",
    		"nature",
    		"worm"
    	],
    	char: "🐛",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var butterfly = {
    	keywords: [
    		"animal",
    		"insect",
    		"nature",
    		"caterpillar"
    	],
    	char: "🦋",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var snail = {
    	keywords: [
    		"slow",
    		"animal",
    		"shell"
    	],
    	char: "🐌",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var beetle = {
    	keywords: [
    		"animal",
    		"insect",
    		"nature",
    		"ladybug"
    	],
    	char: "🐞",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var ant = {
    	keywords: [
    		"animal",
    		"insect",
    		"nature",
    		"bug"
    	],
    	char: "🐜",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var grasshopper = {
    	keywords: [
    		"animal",
    		"cricket",
    		"chirp"
    	],
    	char: "🦗",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var spider = {
    	keywords: [
    		"animal",
    		"arachnid"
    	],
    	char: "🕷",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var scorpion = {
    	keywords: [
    		"animal",
    		"arachnid"
    	],
    	char: "🦂",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var crab = {
    	keywords: [
    		"animal",
    		"crustacean"
    	],
    	char: "🦀",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var snake = {
    	keywords: [
    		"animal",
    		"evil",
    		"nature",
    		"hiss",
    		"python"
    	],
    	char: "🐍",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var lizard = {
    	keywords: [
    		"animal",
    		"nature",
    		"reptile"
    	],
    	char: "🦎",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sauropod = {
    	keywords: [
    		"animal",
    		"nature",
    		"dinosaur",
    		"brachiosaurus",
    		"brontosaurus",
    		"diplodocus",
    		"extinct"
    	],
    	char: "🦕",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var turtle = {
    	keywords: [
    		"animal",
    		"slow",
    		"nature",
    		"tortoise"
    	],
    	char: "🐢",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var tropical_fish = {
    	keywords: [
    		"animal",
    		"swim",
    		"ocean",
    		"beach",
    		"nemo"
    	],
    	char: "🐠",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var fish = {
    	keywords: [
    		"animal",
    		"food",
    		"nature"
    	],
    	char: "🐟",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var blowfish = {
    	keywords: [
    		"animal",
    		"nature",
    		"food",
    		"sea",
    		"ocean"
    	],
    	char: "🐡",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dolphin = {
    	keywords: [
    		"animal",
    		"nature",
    		"fish",
    		"sea",
    		"ocean",
    		"flipper",
    		"fins",
    		"beach"
    	],
    	char: "🐬",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var shark = {
    	keywords: [
    		"animal",
    		"nature",
    		"fish",
    		"sea",
    		"ocean",
    		"jaws",
    		"fins",
    		"beach"
    	],
    	char: "🦈",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var whale = {
    	keywords: [
    		"animal",
    		"nature",
    		"sea",
    		"ocean"
    	],
    	char: "🐳",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var whale2 = {
    	keywords: [
    		"animal",
    		"nature",
    		"sea",
    		"ocean"
    	],
    	char: "🐋",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var crocodile = {
    	keywords: [
    		"animal",
    		"nature",
    		"reptile",
    		"lizard",
    		"alligator"
    	],
    	char: "🐊",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var leopard = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐆",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var zebra = {
    	keywords: [
    		"animal",
    		"nature",
    		"stripes",
    		"safari"
    	],
    	char: "🦓",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var tiger2 = {
    	keywords: [
    		"animal",
    		"nature",
    		"roar"
    	],
    	char: "🐅",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var water_buffalo = {
    	keywords: [
    		"animal",
    		"nature",
    		"ox",
    		"cow"
    	],
    	char: "🐃",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var ox = {
    	keywords: [
    		"animal",
    		"cow",
    		"beef"
    	],
    	char: "🐂",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cow2 = {
    	keywords: [
    		"beef",
    		"ox",
    		"animal",
    		"nature",
    		"moo",
    		"milk"
    	],
    	char: "🐄",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var deer = {
    	keywords: [
    		"animal",
    		"nature",
    		"horns",
    		"venison"
    	],
    	char: "🦌",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dromedary_camel = {
    	keywords: [
    		"animal",
    		"hot",
    		"desert",
    		"hump"
    	],
    	char: "🐪",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var camel = {
    	keywords: [
    		"animal",
    		"nature",
    		"hot",
    		"desert",
    		"hump"
    	],
    	char: "🐫",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var giraffe = {
    	keywords: [
    		"animal",
    		"nature",
    		"spots",
    		"safari"
    	],
    	char: "🦒",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var elephant = {
    	keywords: [
    		"animal",
    		"nature",
    		"nose",
    		"th",
    		"circus"
    	],
    	char: "🐘",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var rhinoceros = {
    	keywords: [
    		"animal",
    		"nature",
    		"horn"
    	],
    	char: "🦏",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var goat = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐐",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var ram = {
    	keywords: [
    		"animal",
    		"sheep",
    		"nature"
    	],
    	char: "🐏",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sheep = {
    	keywords: [
    		"animal",
    		"nature",
    		"wool",
    		"shipit"
    	],
    	char: "🐑",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var racehorse = {
    	keywords: [
    		"animal",
    		"gamble",
    		"luck"
    	],
    	char: "🐎",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var pig2 = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🐖",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var rat = {
    	keywords: [
    		"animal",
    		"mouse",
    		"rodent"
    	],
    	char: "🐀",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var mouse2 = {
    	keywords: [
    		"animal",
    		"nature",
    		"rodent"
    	],
    	char: "🐁",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var rooster = {
    	keywords: [
    		"animal",
    		"nature",
    		"chicken"
    	],
    	char: "🐓",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var turkey = {
    	keywords: [
    		"animal",
    		"bird"
    	],
    	char: "🦃",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dove = {
    	keywords: [
    		"animal",
    		"bird"
    	],
    	char: "🕊",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dog2 = {
    	keywords: [
    		"animal",
    		"nature",
    		"friend",
    		"doge",
    		"pet",
    		"faithful"
    	],
    	char: "🐕",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var poodle = {
    	keywords: [
    		"dog",
    		"animal",
    		"101",
    		"nature",
    		"pet"
    	],
    	char: "🐩",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cat2 = {
    	keywords: [
    		"animal",
    		"meow",
    		"pet",
    		"cats"
    	],
    	char: "🐈",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var rabbit2 = {
    	keywords: [
    		"animal",
    		"nature",
    		"pet",
    		"magic",
    		"spring"
    	],
    	char: "🐇",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var chipmunk = {
    	keywords: [
    		"animal",
    		"nature",
    		"rodent",
    		"squirrel"
    	],
    	char: "🐿",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hedgehog = {
    	keywords: [
    		"animal",
    		"nature",
    		"spiny"
    	],
    	char: "🦔",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var raccoon = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🦝",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var llama = {
    	keywords: [
    		"animal",
    		"nature",
    		"alpaca"
    	],
    	char: "🦙",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hippopotamus = {
    	keywords: [
    		"animal",
    		"nature"
    	],
    	char: "🦛",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var kangaroo = {
    	keywords: [
    		"animal",
    		"nature",
    		"australia",
    		"joey",
    		"hop",
    		"marsupial"
    	],
    	char: "🦘",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var badger = {
    	keywords: [
    		"animal",
    		"nature",
    		"honey"
    	],
    	char: "🦡",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var swan = {
    	keywords: [
    		"animal",
    		"nature",
    		"bird"
    	],
    	char: "🦢",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var peacock = {
    	keywords: [
    		"animal",
    		"nature",
    		"peahen",
    		"bird"
    	],
    	char: "🦚",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var parrot = {
    	keywords: [
    		"animal",
    		"nature",
    		"bird",
    		"pirate",
    		"talk"
    	],
    	char: "🦜",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var lobster = {
    	keywords: [
    		"animal",
    		"nature",
    		"bisque",
    		"claws",
    		"seafood"
    	],
    	char: "🦞",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var mosquito = {
    	keywords: [
    		"animal",
    		"nature",
    		"insect",
    		"malaria"
    	],
    	char: "🦟",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var paw_prints = {
    	keywords: [
    		"animal",
    		"tracking",
    		"footprints",
    		"dog",
    		"cat",
    		"pet",
    		"feet"
    	],
    	char: "🐾",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dragon = {
    	keywords: [
    		"animal",
    		"myth",
    		"nature",
    		"chinese",
    		"green"
    	],
    	char: "🐉",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dragon_face = {
    	keywords: [
    		"animal",
    		"myth",
    		"nature",
    		"chinese",
    		"green"
    	],
    	char: "🐲",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cactus = {
    	keywords: [
    		"vegetable",
    		"plant",
    		"nature"
    	],
    	char: "🌵",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var christmas_tree = {
    	keywords: [
    		"festival",
    		"vacation",
    		"december",
    		"xmas",
    		"celebration"
    	],
    	char: "🎄",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var evergreen_tree = {
    	keywords: [
    		"plant",
    		"nature"
    	],
    	char: "🌲",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var deciduous_tree = {
    	keywords: [
    		"plant",
    		"nature"
    	],
    	char: "🌳",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var palm_tree = {
    	keywords: [
    		"plant",
    		"vegetable",
    		"nature",
    		"summer",
    		"beach",
    		"mojito",
    		"tropical"
    	],
    	char: "🌴",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var seedling = {
    	keywords: [
    		"plant",
    		"nature",
    		"grass",
    		"lawn",
    		"spring"
    	],
    	char: "🌱",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var herb = {
    	keywords: [
    		"vegetable",
    		"plant",
    		"medicine",
    		"weed",
    		"grass",
    		"lawn"
    	],
    	char: "🌿",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var shamrock = {
    	keywords: [
    		"vegetable",
    		"plant",
    		"nature",
    		"irish",
    		"clover"
    	],
    	char: "☘",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var four_leaf_clover = {
    	keywords: [
    		"vegetable",
    		"plant",
    		"nature",
    		"lucky",
    		"irish"
    	],
    	char: "🍀",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var bamboo = {
    	keywords: [
    		"plant",
    		"nature",
    		"vegetable",
    		"panda",
    		"pine_decoration"
    	],
    	char: "🎍",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var tanabata_tree = {
    	keywords: [
    		"plant",
    		"nature",
    		"branch",
    		"summer"
    	],
    	char: "🎋",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var leaves = {
    	keywords: [
    		"nature",
    		"plant",
    		"tree",
    		"vegetable",
    		"grass",
    		"lawn",
    		"spring"
    	],
    	char: "🍃",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var fallen_leaf = {
    	keywords: [
    		"nature",
    		"plant",
    		"vegetable",
    		"leaves"
    	],
    	char: "🍂",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var maple_leaf = {
    	keywords: [
    		"nature",
    		"plant",
    		"vegetable",
    		"ca",
    		"fall"
    	],
    	char: "🍁",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var ear_of_rice = {
    	keywords: [
    		"nature",
    		"plant"
    	],
    	char: "🌾",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var hibiscus = {
    	keywords: [
    		"plant",
    		"vegetable",
    		"flowers",
    		"beach"
    	],
    	char: "🌺",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sunflower = {
    	keywords: [
    		"nature",
    		"plant",
    		"fall"
    	],
    	char: "🌻",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var rose = {
    	keywords: [
    		"flowers",
    		"valentines",
    		"love",
    		"spring"
    	],
    	char: "🌹",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var wilted_flower = {
    	keywords: [
    		"plant",
    		"nature",
    		"flower"
    	],
    	char: "🥀",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var tulip = {
    	keywords: [
    		"flowers",
    		"plant",
    		"nature",
    		"summer",
    		"spring"
    	],
    	char: "🌷",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var blossom = {
    	keywords: [
    		"nature",
    		"flowers",
    		"yellow"
    	],
    	char: "🌼",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cherry_blossom = {
    	keywords: [
    		"nature",
    		"plant",
    		"spring",
    		"flower"
    	],
    	char: "🌸",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var bouquet = {
    	keywords: [
    		"flowers",
    		"nature",
    		"spring"
    	],
    	char: "💐",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var mushroom = {
    	keywords: [
    		"plant",
    		"vegetable"
    	],
    	char: "🍄",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var chestnut = {
    	keywords: [
    		"food",
    		"squirrel"
    	],
    	char: "🌰",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var jack_o_lantern = {
    	keywords: [
    		"halloween",
    		"light",
    		"pumpkin",
    		"creepy",
    		"fall"
    	],
    	char: "🎃",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var shell = {
    	keywords: [
    		"nature",
    		"sea",
    		"beach"
    	],
    	char: "🐚",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var spider_web = {
    	keywords: [
    		"animal",
    		"insect",
    		"arachnid",
    		"silk"
    	],
    	char: "🕸",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var earth_americas = {
    	keywords: [
    		"globe",
    		"world",
    		"USA",
    		"international"
    	],
    	char: "🌎",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var earth_africa = {
    	keywords: [
    		"globe",
    		"world",
    		"international"
    	],
    	char: "🌍",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var earth_asia = {
    	keywords: [
    		"globe",
    		"world",
    		"east",
    		"international"
    	],
    	char: "🌏",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var full_moon = {
    	keywords: [
    		"nature",
    		"yellow",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌕",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var waning_gibbous_moon = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep",
    		"waxing_gibbous_moon"
    	],
    	char: "🌖",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var last_quarter_moon = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌗",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var waning_crescent_moon = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌘",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var new_moon = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌑",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var waxing_crescent_moon = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌒",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var first_quarter_moon = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌓",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var waxing_gibbous_moon = {
    	keywords: [
    		"nature",
    		"night",
    		"sky",
    		"gray",
    		"twilight",
    		"planet",
    		"space",
    		"evening",
    		"sleep"
    	],
    	char: "🌔",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var new_moon_with_face = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌚",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var full_moon_with_face = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌝",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var first_quarter_moon_with_face = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌛",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var last_quarter_moon_with_face = {
    	keywords: [
    		"nature",
    		"twilight",
    		"planet",
    		"space",
    		"night",
    		"evening",
    		"sleep"
    	],
    	char: "🌜",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sun_with_face = {
    	keywords: [
    		"nature",
    		"morning",
    		"sky"
    	],
    	char: "🌞",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var crescent_moon = {
    	keywords: [
    		"night",
    		"sleep",
    		"sky",
    		"evening",
    		"magic"
    	],
    	char: "🌙",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var star = {
    	keywords: [
    		"night",
    		"yellow"
    	],
    	char: "⭐",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var star2 = {
    	keywords: [
    		"night",
    		"sparkle",
    		"awesome",
    		"good",
    		"magic"
    	],
    	char: "🌟",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dizzy = {
    	keywords: [
    		"star",
    		"sparkle",
    		"shoot",
    		"magic"
    	],
    	char: "💫",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sparkles = {
    	keywords: [
    		"stars",
    		"shine",
    		"shiny",
    		"cool",
    		"awesome",
    		"good",
    		"magic"
    	],
    	char: "✨",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var comet = {
    	keywords: [
    		"space"
    	],
    	char: "☄",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sunny = {
    	keywords: [
    		"weather",
    		"nature",
    		"brightness",
    		"summer",
    		"beach",
    		"spring"
    	],
    	char: "☀️",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sun_behind_small_cloud = {
    	keywords: [
    		"weather"
    	],
    	char: "🌤",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var partly_sunny = {
    	keywords: [
    		"weather",
    		"nature",
    		"cloudy",
    		"morning",
    		"fall",
    		"spring"
    	],
    	char: "⛅",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sun_behind_large_cloud = {
    	keywords: [
    		"weather"
    	],
    	char: "🌥",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sun_behind_rain_cloud = {
    	keywords: [
    		"weather"
    	],
    	char: "🌦",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cloud = {
    	keywords: [
    		"weather",
    		"sky"
    	],
    	char: "☁️",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cloud_with_rain = {
    	keywords: [
    		"weather"
    	],
    	char: "🌧",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cloud_with_lightning_and_rain = {
    	keywords: [
    		"weather",
    		"lightning"
    	],
    	char: "⛈",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cloud_with_lightning = {
    	keywords: [
    		"weather",
    		"thunder"
    	],
    	char: "🌩",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var zap = {
    	keywords: [
    		"thunder",
    		"weather",
    		"lightning bolt",
    		"fast"
    	],
    	char: "⚡",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var fire = {
    	keywords: [
    		"hot",
    		"cook",
    		"flame"
    	],
    	char: "🔥",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var boom = {
    	keywords: [
    		"bomb",
    		"explode",
    		"explosion",
    		"collision",
    		"blown"
    	],
    	char: "💥",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var snowflake = {
    	keywords: [
    		"winter",
    		"season",
    		"cold",
    		"weather",
    		"christmas",
    		"xmas"
    	],
    	char: "❄️",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var cloud_with_snow = {
    	keywords: [
    		"weather"
    	],
    	char: "🌨",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var snowman = {
    	keywords: [
    		"winter",
    		"season",
    		"cold",
    		"weather",
    		"christmas",
    		"xmas",
    		"frozen",
    		"without_snow"
    	],
    	char: "⛄",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var snowman_with_snow = {
    	keywords: [
    		"winter",
    		"season",
    		"cold",
    		"weather",
    		"christmas",
    		"xmas",
    		"frozen"
    	],
    	char: "☃",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var wind_face = {
    	keywords: [
    		"gust",
    		"air"
    	],
    	char: "🌬",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var dash = {
    	keywords: [
    		"wind",
    		"air",
    		"fast",
    		"shoo",
    		"fart",
    		"smoke",
    		"puff"
    	],
    	char: "💨",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var tornado = {
    	keywords: [
    		"weather",
    		"cyclone",
    		"twister"
    	],
    	char: "🌪",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var fog = {
    	keywords: [
    		"weather"
    	],
    	char: "🌫",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var open_umbrella = {
    	keywords: [
    		"weather",
    		"spring"
    	],
    	char: "☂",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var umbrella = {
    	keywords: [
    		"rainy",
    		"weather",
    		"spring"
    	],
    	char: "☔",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var droplet = {
    	keywords: [
    		"water",
    		"drip",
    		"faucet",
    		"spring"
    	],
    	char: "💧",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var sweat_drops = {
    	keywords: [
    		"water",
    		"drip",
    		"oops"
    	],
    	char: "💦",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var ocean = {
    	keywords: [
    		"sea",
    		"water",
    		"wave",
    		"nature",
    		"tsunami",
    		"disaster"
    	],
    	char: "🌊",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    };
    var green_apple = {
    	keywords: [
    		"fruit",
    		"nature"
    	],
    	char: "🍏",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var apple = {
    	keywords: [
    		"fruit",
    		"mac",
    		"school"
    	],
    	char: "🍎",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var pear = {
    	keywords: [
    		"fruit",
    		"nature",
    		"food"
    	],
    	char: "🍐",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var tangerine = {
    	keywords: [
    		"food",
    		"fruit",
    		"nature",
    		"orange"
    	],
    	char: "🍊",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var lemon = {
    	keywords: [
    		"fruit",
    		"nature"
    	],
    	char: "🍋",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var banana = {
    	keywords: [
    		"fruit",
    		"food",
    		"monkey"
    	],
    	char: "🍌",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var watermelon = {
    	keywords: [
    		"fruit",
    		"food",
    		"picnic",
    		"summer"
    	],
    	char: "🍉",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var grapes = {
    	keywords: [
    		"fruit",
    		"food",
    		"wine"
    	],
    	char: "🍇",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var strawberry = {
    	keywords: [
    		"fruit",
    		"food",
    		"nature"
    	],
    	char: "🍓",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var melon = {
    	keywords: [
    		"fruit",
    		"nature",
    		"food"
    	],
    	char: "🍈",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cherries = {
    	keywords: [
    		"food",
    		"fruit"
    	],
    	char: "🍒",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var peach = {
    	keywords: [
    		"fruit",
    		"nature",
    		"food"
    	],
    	char: "🍑",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var pineapple = {
    	keywords: [
    		"fruit",
    		"nature",
    		"food"
    	],
    	char: "🍍",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var coconut = {
    	keywords: [
    		"fruit",
    		"nature",
    		"food",
    		"palm"
    	],
    	char: "🥥",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var kiwi_fruit = {
    	keywords: [
    		"fruit",
    		"food"
    	],
    	char: "🥝",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var mango = {
    	keywords: [
    		"fruit",
    		"food",
    		"tropical"
    	],
    	char: "🥭",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var avocado = {
    	keywords: [
    		"fruit",
    		"food"
    	],
    	char: "🥑",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var broccoli = {
    	keywords: [
    		"fruit",
    		"food",
    		"vegetable"
    	],
    	char: "🥦",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var tomato = {
    	keywords: [
    		"fruit",
    		"vegetable",
    		"nature",
    		"food"
    	],
    	char: "🍅",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var eggplant = {
    	keywords: [
    		"vegetable",
    		"nature",
    		"food",
    		"aubergine"
    	],
    	char: "🍆",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cucumber = {
    	keywords: [
    		"fruit",
    		"food",
    		"pickle"
    	],
    	char: "🥒",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var carrot = {
    	keywords: [
    		"vegetable",
    		"food",
    		"orange"
    	],
    	char: "🥕",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var hot_pepper = {
    	keywords: [
    		"food",
    		"spicy",
    		"chilli",
    		"chili"
    	],
    	char: "🌶",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var potato = {
    	keywords: [
    		"food",
    		"tuber",
    		"vegatable",
    		"starch"
    	],
    	char: "🥔",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var corn = {
    	keywords: [
    		"food",
    		"vegetable",
    		"plant"
    	],
    	char: "🌽",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var leafy_greens = {
    	keywords: [
    		"food",
    		"vegetable",
    		"plant",
    		"bok choy",
    		"cabbage",
    		"kale",
    		"lettuce"
    	],
    	char: "🥬",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var sweet_potato = {
    	keywords: [
    		"food",
    		"nature"
    	],
    	char: "🍠",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var peanuts = {
    	keywords: [
    		"food",
    		"nut"
    	],
    	char: "🥜",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var honey_pot = {
    	keywords: [
    		"bees",
    		"sweet",
    		"kitchen"
    	],
    	char: "🍯",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var croissant = {
    	keywords: [
    		"food",
    		"bread",
    		"french"
    	],
    	char: "🥐",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var bread = {
    	keywords: [
    		"food",
    		"wheat",
    		"breakfast",
    		"toast"
    	],
    	char: "🍞",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var baguette_bread = {
    	keywords: [
    		"food",
    		"bread",
    		"french"
    	],
    	char: "🥖",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var bagel = {
    	keywords: [
    		"food",
    		"bread",
    		"bakery",
    		"schmear"
    	],
    	char: "🥯",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var pretzel = {
    	keywords: [
    		"food",
    		"bread",
    		"twisted"
    	],
    	char: "🥨",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cheese = {
    	keywords: [
    		"food",
    		"chadder"
    	],
    	char: "🧀",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var egg = {
    	keywords: [
    		"food",
    		"chicken",
    		"breakfast"
    	],
    	char: "🥚",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var bacon = {
    	keywords: [
    		"food",
    		"breakfast",
    		"pork",
    		"pig",
    		"meat"
    	],
    	char: "🥓",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var steak = {
    	keywords: [
    		"food",
    		"cow",
    		"meat",
    		"cut",
    		"chop",
    		"lambchop",
    		"porkchop"
    	],
    	char: "🥩",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var pancakes = {
    	keywords: [
    		"food",
    		"breakfast",
    		"flapjacks",
    		"hotcakes"
    	],
    	char: "🥞",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var poultry_leg = {
    	keywords: [
    		"food",
    		"meat",
    		"drumstick",
    		"bird",
    		"chicken",
    		"turkey"
    	],
    	char: "🍗",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var meat_on_bone = {
    	keywords: [
    		"good",
    		"food",
    		"drumstick"
    	],
    	char: "🍖",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var bone = {
    	keywords: [
    		"skeleton"
    	],
    	char: "🦴",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var fried_shrimp = {
    	keywords: [
    		"food",
    		"animal",
    		"appetizer",
    		"summer"
    	],
    	char: "🍤",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var fried_egg = {
    	keywords: [
    		"food",
    		"breakfast",
    		"kitchen",
    		"egg"
    	],
    	char: "🍳",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var hamburger = {
    	keywords: [
    		"meat",
    		"fast food",
    		"beef",
    		"cheeseburger",
    		"mcdonalds",
    		"burger king"
    	],
    	char: "🍔",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var fries = {
    	keywords: [
    		"chips",
    		"snack",
    		"fast food"
    	],
    	char: "🍟",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var stuffed_flatbread = {
    	keywords: [
    		"food",
    		"flatbread",
    		"stuffed",
    		"gyro"
    	],
    	char: "🥙",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var hotdog = {
    	keywords: [
    		"food",
    		"frankfurter"
    	],
    	char: "🌭",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var pizza = {
    	keywords: [
    		"food",
    		"party"
    	],
    	char: "🍕",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var sandwich = {
    	keywords: [
    		"food",
    		"lunch",
    		"bread"
    	],
    	char: "🥪",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var canned_food = {
    	keywords: [
    		"food",
    		"soup"
    	],
    	char: "🥫",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var spaghetti = {
    	keywords: [
    		"food",
    		"italian",
    		"noodle"
    	],
    	char: "🍝",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var taco = {
    	keywords: [
    		"food",
    		"mexican"
    	],
    	char: "🌮",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var burrito = {
    	keywords: [
    		"food",
    		"mexican"
    	],
    	char: "🌯",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var green_salad = {
    	keywords: [
    		"food",
    		"healthy",
    		"lettuce"
    	],
    	char: "🥗",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var shallow_pan_of_food = {
    	keywords: [
    		"food",
    		"cooking",
    		"casserole",
    		"paella"
    	],
    	char: "🥘",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var ramen = {
    	keywords: [
    		"food",
    		"japanese",
    		"noodle",
    		"chopsticks"
    	],
    	char: "🍜",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var stew = {
    	keywords: [
    		"food",
    		"meat",
    		"soup"
    	],
    	char: "🍲",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var fish_cake = {
    	keywords: [
    		"food",
    		"japan",
    		"sea",
    		"beach",
    		"narutomaki",
    		"pink",
    		"swirl",
    		"kamaboko",
    		"surimi",
    		"ramen"
    	],
    	char: "🍥",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var fortune_cookie = {
    	keywords: [
    		"food",
    		"prophecy"
    	],
    	char: "🥠",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var sushi = {
    	keywords: [
    		"food",
    		"fish",
    		"japanese",
    		"rice"
    	],
    	char: "🍣",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var bento = {
    	keywords: [
    		"food",
    		"japanese",
    		"box"
    	],
    	char: "🍱",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var curry = {
    	keywords: [
    		"food",
    		"spicy",
    		"hot",
    		"indian"
    	],
    	char: "🍛",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var rice_ball = {
    	keywords: [
    		"food",
    		"japanese"
    	],
    	char: "🍙",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var rice = {
    	keywords: [
    		"food",
    		"china",
    		"asian"
    	],
    	char: "🍚",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var rice_cracker = {
    	keywords: [
    		"food",
    		"japanese"
    	],
    	char: "🍘",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var oden = {
    	keywords: [
    		"food",
    		"japanese"
    	],
    	char: "🍢",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var dango = {
    	keywords: [
    		"food",
    		"dessert",
    		"sweet",
    		"japanese",
    		"barbecue",
    		"meat"
    	],
    	char: "🍡",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var shaved_ice = {
    	keywords: [
    		"hot",
    		"dessert",
    		"summer"
    	],
    	char: "🍧",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var ice_cream = {
    	keywords: [
    		"food",
    		"hot",
    		"dessert"
    	],
    	char: "🍨",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var icecream = {
    	keywords: [
    		"food",
    		"hot",
    		"dessert",
    		"summer"
    	],
    	char: "🍦",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var pie = {
    	keywords: [
    		"food",
    		"dessert",
    		"pastry"
    	],
    	char: "🥧",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cake = {
    	keywords: [
    		"food",
    		"dessert"
    	],
    	char: "🍰",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cupcake = {
    	keywords: [
    		"food",
    		"dessert",
    		"bakery",
    		"sweet"
    	],
    	char: "🧁",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var moon_cake = {
    	keywords: [
    		"food",
    		"autumn"
    	],
    	char: "🥮",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var birthday = {
    	keywords: [
    		"food",
    		"dessert",
    		"cake"
    	],
    	char: "🎂",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var custard = {
    	keywords: [
    		"dessert",
    		"food"
    	],
    	char: "🍮",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var candy = {
    	keywords: [
    		"snack",
    		"dessert",
    		"sweet",
    		"lolly"
    	],
    	char: "🍬",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var lollipop = {
    	keywords: [
    		"food",
    		"snack",
    		"candy",
    		"sweet"
    	],
    	char: "🍭",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var chocolate_bar = {
    	keywords: [
    		"food",
    		"snack",
    		"dessert",
    		"sweet"
    	],
    	char: "🍫",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var popcorn = {
    	keywords: [
    		"food",
    		"movie theater",
    		"films",
    		"snack"
    	],
    	char: "🍿",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var dumpling = {
    	keywords: [
    		"food",
    		"empanada",
    		"pierogi",
    		"potsticker"
    	],
    	char: "🥟",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var doughnut = {
    	keywords: [
    		"food",
    		"dessert",
    		"snack",
    		"sweet",
    		"donut"
    	],
    	char: "🍩",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cookie = {
    	keywords: [
    		"food",
    		"snack",
    		"oreo",
    		"chocolate",
    		"sweet",
    		"dessert"
    	],
    	char: "🍪",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var milk_glass = {
    	keywords: [
    		"beverage",
    		"drink",
    		"cow"
    	],
    	char: "🥛",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var beer = {
    	keywords: [
    		"relax",
    		"beverage",
    		"drink",
    		"drunk",
    		"party",
    		"pub",
    		"summer",
    		"alcohol",
    		"booze"
    	],
    	char: "🍺",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var beers = {
    	keywords: [
    		"relax",
    		"beverage",
    		"drink",
    		"drunk",
    		"party",
    		"pub",
    		"summer",
    		"alcohol",
    		"booze"
    	],
    	char: "🍻",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var clinking_glasses = {
    	keywords: [
    		"beverage",
    		"drink",
    		"party",
    		"alcohol",
    		"celebrate",
    		"cheers",
    		"wine",
    		"champagne",
    		"toast"
    	],
    	char: "🥂",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var wine_glass = {
    	keywords: [
    		"drink",
    		"beverage",
    		"drunk",
    		"alcohol",
    		"booze"
    	],
    	char: "🍷",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var tumbler_glass = {
    	keywords: [
    		"drink",
    		"beverage",
    		"drunk",
    		"alcohol",
    		"liquor",
    		"booze",
    		"bourbon",
    		"scotch",
    		"whisky",
    		"glass",
    		"shot"
    	],
    	char: "🥃",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cocktail = {
    	keywords: [
    		"drink",
    		"drunk",
    		"alcohol",
    		"beverage",
    		"booze",
    		"mojito"
    	],
    	char: "🍸",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var tropical_drink = {
    	keywords: [
    		"beverage",
    		"cocktail",
    		"summer",
    		"beach",
    		"alcohol",
    		"booze",
    		"mojito"
    	],
    	char: "🍹",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var champagne = {
    	keywords: [
    		"drink",
    		"wine",
    		"bottle",
    		"celebration"
    	],
    	char: "🍾",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var sake = {
    	keywords: [
    		"wine",
    		"drink",
    		"drunk",
    		"beverage",
    		"japanese",
    		"alcohol",
    		"booze"
    	],
    	char: "🍶",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var tea = {
    	keywords: [
    		"drink",
    		"bowl",
    		"breakfast",
    		"green",
    		"british"
    	],
    	char: "🍵",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var cup_with_straw = {
    	keywords: [
    		"drink",
    		"soda"
    	],
    	char: "🥤",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var coffee = {
    	keywords: [
    		"beverage",
    		"caffeine",
    		"latte",
    		"espresso"
    	],
    	char: "☕",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var baby_bottle = {
    	keywords: [
    		"food",
    		"container",
    		"milk"
    	],
    	char: "🍼",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var salt = {
    	keywords: [
    		"condiment",
    		"shaker"
    	],
    	char: "🧂",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var spoon = {
    	keywords: [
    		"cutlery",
    		"kitchen",
    		"tableware"
    	],
    	char: "🥄",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var fork_and_knife = {
    	keywords: [
    		"cutlery",
    		"kitchen"
    	],
    	char: "🍴",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var plate_with_cutlery = {
    	keywords: [
    		"food",
    		"eat",
    		"meal",
    		"lunch",
    		"dinner",
    		"restaurant"
    	],
    	char: "🍽",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var bowl_with_spoon = {
    	keywords: [
    		"food",
    		"breakfast",
    		"cereal",
    		"oatmeal",
    		"porridge"
    	],
    	char: "🥣",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var takeout_box = {
    	keywords: [
    		"food",
    		"leftovers"
    	],
    	char: "🥡",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var chopsticks = {
    	keywords: [
    		"food"
    	],
    	char: "🥢",
    	fitzpatrick_scale: false,
    	category: "food_and_drink"
    };
    var soccer = {
    	keywords: [
    		"sports",
    		"football"
    	],
    	char: "⚽",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var basketball = {
    	keywords: [
    		"sports",
    		"balls",
    		"NBA"
    	],
    	char: "🏀",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var football = {
    	keywords: [
    		"sports",
    		"balls",
    		"NFL"
    	],
    	char: "🏈",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var baseball = {
    	keywords: [
    		"sports",
    		"balls"
    	],
    	char: "⚾",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var softball = {
    	keywords: [
    		"sports",
    		"balls"
    	],
    	char: "🥎",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var tennis = {
    	keywords: [
    		"sports",
    		"balls",
    		"green"
    	],
    	char: "🎾",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var volleyball = {
    	keywords: [
    		"sports",
    		"balls"
    	],
    	char: "🏐",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var rugby_football = {
    	keywords: [
    		"sports",
    		"team"
    	],
    	char: "🏉",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var flying_disc = {
    	keywords: [
    		"sports",
    		"frisbee",
    		"ultimate"
    	],
    	char: "🥏",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var golf = {
    	keywords: [
    		"sports",
    		"business",
    		"flag",
    		"hole",
    		"summer"
    	],
    	char: "⛳",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var golfing_woman = {
    	keywords: [
    		"sports",
    		"business",
    		"woman",
    		"female"
    	],
    	char: "🏌️‍♀️",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var golfing_man = {
    	keywords: [
    		"sports",
    		"business"
    	],
    	char: "🏌",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var ping_pong = {
    	keywords: [
    		"sports",
    		"pingpong"
    	],
    	char: "🏓",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var badminton = {
    	keywords: [
    		"sports"
    	],
    	char: "🏸",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var goal_net = {
    	keywords: [
    		"sports"
    	],
    	char: "🥅",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var ice_hockey = {
    	keywords: [
    		"sports"
    	],
    	char: "🏒",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var field_hockey = {
    	keywords: [
    		"sports"
    	],
    	char: "🏑",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var lacrosse = {
    	keywords: [
    		"sports",
    		"ball",
    		"stick"
    	],
    	char: "🥍",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var cricket = {
    	keywords: [
    		"sports"
    	],
    	char: "🏏",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var ski = {
    	keywords: [
    		"sports",
    		"winter",
    		"cold",
    		"snow"
    	],
    	char: "🎿",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var skier = {
    	keywords: [
    		"sports",
    		"winter",
    		"snow"
    	],
    	char: "⛷",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var snowboarder = {
    	keywords: [
    		"sports",
    		"winter"
    	],
    	char: "🏂",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var person_fencing = {
    	keywords: [
    		"sports",
    		"fencing",
    		"sword"
    	],
    	char: "🤺",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var women_wrestling = {
    	keywords: [
    		"sports",
    		"wrestlers"
    	],
    	char: "🤼‍♀️",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var men_wrestling = {
    	keywords: [
    		"sports",
    		"wrestlers"
    	],
    	char: "🤼‍♂️",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var woman_cartwheeling = {
    	keywords: [
    		"gymnastics"
    	],
    	char: "🤸‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var man_cartwheeling = {
    	keywords: [
    		"gymnastics"
    	],
    	char: "🤸‍♂️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var woman_playing_handball = {
    	keywords: [
    		"sports"
    	],
    	char: "🤾‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var man_playing_handball = {
    	keywords: [
    		"sports"
    	],
    	char: "🤾‍♂️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var ice_skate = {
    	keywords: [
    		"sports"
    	],
    	char: "⛸",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var curling_stone = {
    	keywords: [
    		"sports"
    	],
    	char: "🥌",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var skateboard = {
    	keywords: [
    		"board"
    	],
    	char: "🛹",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var sled = {
    	keywords: [
    		"sleigh",
    		"luge",
    		"toboggan"
    	],
    	char: "🛷",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var bow_and_arrow = {
    	keywords: [
    		"sports"
    	],
    	char: "🏹",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var fishing_pole_and_fish = {
    	keywords: [
    		"food",
    		"hobby",
    		"summer"
    	],
    	char: "🎣",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var boxing_glove = {
    	keywords: [
    		"sports",
    		"fighting"
    	],
    	char: "🥊",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var martial_arts_uniform = {
    	keywords: [
    		"judo",
    		"karate",
    		"taekwondo"
    	],
    	char: "🥋",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var rowing_woman = {
    	keywords: [
    		"sports",
    		"hobby",
    		"water",
    		"ship",
    		"woman",
    		"female"
    	],
    	char: "🚣‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var rowing_man = {
    	keywords: [
    		"sports",
    		"hobby",
    		"water",
    		"ship"
    	],
    	char: "🚣",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var climbing_woman = {
    	keywords: [
    		"sports",
    		"hobby",
    		"woman",
    		"female",
    		"rock"
    	],
    	char: "🧗‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var climbing_man = {
    	keywords: [
    		"sports",
    		"hobby",
    		"man",
    		"male",
    		"rock"
    	],
    	char: "🧗‍♂️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var swimming_woman = {
    	keywords: [
    		"sports",
    		"exercise",
    		"human",
    		"athlete",
    		"water",
    		"summer",
    		"woman",
    		"female"
    	],
    	char: "🏊‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var swimming_man = {
    	keywords: [
    		"sports",
    		"exercise",
    		"human",
    		"athlete",
    		"water",
    		"summer"
    	],
    	char: "🏊",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var woman_playing_water_polo = {
    	keywords: [
    		"sports",
    		"pool"
    	],
    	char: "🤽‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var man_playing_water_polo = {
    	keywords: [
    		"sports",
    		"pool"
    	],
    	char: "🤽‍♂️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var woman_in_lotus_position = {
    	keywords: [
    		"woman",
    		"female",
    		"meditation",
    		"yoga",
    		"serenity",
    		"zen",
    		"mindfulness"
    	],
    	char: "🧘‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var man_in_lotus_position = {
    	keywords: [
    		"man",
    		"male",
    		"meditation",
    		"yoga",
    		"serenity",
    		"zen",
    		"mindfulness"
    	],
    	char: "🧘‍♂️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var surfing_woman = {
    	keywords: [
    		"sports",
    		"ocean",
    		"sea",
    		"summer",
    		"beach",
    		"woman",
    		"female"
    	],
    	char: "🏄‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var surfing_man = {
    	keywords: [
    		"sports",
    		"ocean",
    		"sea",
    		"summer",
    		"beach"
    	],
    	char: "🏄",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var bath = {
    	keywords: [
    		"clean",
    		"shower",
    		"bathroom"
    	],
    	char: "🛀",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var basketball_woman = {
    	keywords: [
    		"sports",
    		"human",
    		"woman",
    		"female"
    	],
    	char: "⛹️‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var basketball_man = {
    	keywords: [
    		"sports",
    		"human"
    	],
    	char: "⛹",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var weight_lifting_woman = {
    	keywords: [
    		"sports",
    		"training",
    		"exercise",
    		"woman",
    		"female"
    	],
    	char: "🏋️‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var weight_lifting_man = {
    	keywords: [
    		"sports",
    		"training",
    		"exercise"
    	],
    	char: "🏋",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var biking_woman = {
    	keywords: [
    		"sports",
    		"bike",
    		"exercise",
    		"hipster",
    		"woman",
    		"female"
    	],
    	char: "🚴‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var biking_man = {
    	keywords: [
    		"sports",
    		"bike",
    		"exercise",
    		"hipster"
    	],
    	char: "🚴",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var mountain_biking_woman = {
    	keywords: [
    		"transportation",
    		"sports",
    		"human",
    		"race",
    		"bike",
    		"woman",
    		"female"
    	],
    	char: "🚵‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var mountain_biking_man = {
    	keywords: [
    		"transportation",
    		"sports",
    		"human",
    		"race",
    		"bike"
    	],
    	char: "🚵",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var horse_racing = {
    	keywords: [
    		"animal",
    		"betting",
    		"competition",
    		"gambling",
    		"luck"
    	],
    	char: "🏇",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var business_suit_levitating = {
    	keywords: [
    		"suit",
    		"business",
    		"levitate",
    		"hover",
    		"jump"
    	],
    	char: "🕴",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var trophy = {
    	keywords: [
    		"win",
    		"award",
    		"contest",
    		"place",
    		"ftw",
    		"ceremony"
    	],
    	char: "🏆",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var running_shirt_with_sash = {
    	keywords: [
    		"play",
    		"pageant"
    	],
    	char: "🎽",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var medal_sports = {
    	keywords: [
    		"award",
    		"winning"
    	],
    	char: "🏅",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var medal_military = {
    	keywords: [
    		"award",
    		"winning",
    		"army"
    	],
    	char: "🎖",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var reminder_ribbon = {
    	keywords: [
    		"sports",
    		"cause",
    		"support",
    		"awareness"
    	],
    	char: "🎗",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var rosette = {
    	keywords: [
    		"flower",
    		"decoration",
    		"military"
    	],
    	char: "🏵",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var ticket = {
    	keywords: [
    		"event",
    		"concert",
    		"pass"
    	],
    	char: "🎫",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var tickets = {
    	keywords: [
    		"sports",
    		"concert",
    		"entrance"
    	],
    	char: "🎟",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var performing_arts = {
    	keywords: [
    		"acting",
    		"theater",
    		"drama"
    	],
    	char: "🎭",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var art = {
    	keywords: [
    		"design",
    		"paint",
    		"draw",
    		"colors"
    	],
    	char: "🎨",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var circus_tent = {
    	keywords: [
    		"festival",
    		"carnival",
    		"party"
    	],
    	char: "🎪",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var woman_juggling = {
    	keywords: [
    		"juggle",
    		"balance",
    		"skill",
    		"multitask"
    	],
    	char: "🤹‍♀️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var man_juggling = {
    	keywords: [
    		"juggle",
    		"balance",
    		"skill",
    		"multitask"
    	],
    	char: "🤹‍♂️",
    	fitzpatrick_scale: true,
    	category: "activity"
    };
    var microphone = {
    	keywords: [
    		"sound",
    		"music",
    		"PA",
    		"sing",
    		"talkshow"
    	],
    	char: "🎤",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var headphones = {
    	keywords: [
    		"music",
    		"score",
    		"gadgets"
    	],
    	char: "🎧",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var musical_score = {
    	keywords: [
    		"treble",
    		"clef",
    		"compose"
    	],
    	char: "🎼",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var musical_keyboard = {
    	keywords: [
    		"piano",
    		"instrument",
    		"compose"
    	],
    	char: "🎹",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var drum = {
    	keywords: [
    		"music",
    		"instrument",
    		"drumsticks",
    		"snare"
    	],
    	char: "🥁",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var saxophone = {
    	keywords: [
    		"music",
    		"instrument",
    		"jazz",
    		"blues"
    	],
    	char: "🎷",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var trumpet = {
    	keywords: [
    		"music",
    		"brass"
    	],
    	char: "🎺",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var guitar = {
    	keywords: [
    		"music",
    		"instrument"
    	],
    	char: "🎸",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var violin = {
    	keywords: [
    		"music",
    		"instrument",
    		"orchestra",
    		"symphony"
    	],
    	char: "🎻",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var clapper = {
    	keywords: [
    		"movie",
    		"film",
    		"record"
    	],
    	char: "🎬",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var video_game = {
    	keywords: [
    		"play",
    		"console",
    		"PS4",
    		"controller"
    	],
    	char: "🎮",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var space_invader = {
    	keywords: [
    		"game",
    		"arcade",
    		"play"
    	],
    	char: "👾",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var dart = {
    	keywords: [
    		"game",
    		"play",
    		"bar",
    		"target",
    		"bullseye"
    	],
    	char: "🎯",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var game_die = {
    	keywords: [
    		"dice",
    		"random",
    		"tabletop",
    		"play",
    		"luck"
    	],
    	char: "🎲",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var chess_pawn = {
    	keywords: [
    		"expendable"
    	],
    	char: "♟",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var slot_machine = {
    	keywords: [
    		"bet",
    		"gamble",
    		"vegas",
    		"fruit machine",
    		"luck",
    		"casino"
    	],
    	char: "🎰",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var jigsaw = {
    	keywords: [
    		"interlocking",
    		"puzzle",
    		"piece"
    	],
    	char: "🧩",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var bowling = {
    	keywords: [
    		"sports",
    		"fun",
    		"play"
    	],
    	char: "🎳",
    	fitzpatrick_scale: false,
    	category: "activity"
    };
    var red_car = {
    	keywords: [
    		"red",
    		"transportation",
    		"vehicle"
    	],
    	char: "🚗",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var taxi = {
    	keywords: [
    		"uber",
    		"vehicle",
    		"cars",
    		"transportation"
    	],
    	char: "🚕",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var blue_car = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚙",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var bus = {
    	keywords: [
    		"car",
    		"vehicle",
    		"transportation"
    	],
    	char: "🚌",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var trolleybus = {
    	keywords: [
    		"bart",
    		"transportation",
    		"vehicle"
    	],
    	char: "🚎",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var racing_car = {
    	keywords: [
    		"sports",
    		"race",
    		"fast",
    		"formula",
    		"f1"
    	],
    	char: "🏎",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var police_car = {
    	keywords: [
    		"vehicle",
    		"cars",
    		"transportation",
    		"law",
    		"legal",
    		"enforcement"
    	],
    	char: "🚓",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var ambulance = {
    	keywords: [
    		"health",
    		"911",
    		"hospital"
    	],
    	char: "🚑",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var fire_engine = {
    	keywords: [
    		"transportation",
    		"cars",
    		"vehicle"
    	],
    	char: "🚒",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var minibus = {
    	keywords: [
    		"vehicle",
    		"car",
    		"transportation"
    	],
    	char: "🚐",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var truck = {
    	keywords: [
    		"cars",
    		"transportation"
    	],
    	char: "🚚",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var articulated_lorry = {
    	keywords: [
    		"vehicle",
    		"cars",
    		"transportation",
    		"express"
    	],
    	char: "🚛",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var tractor = {
    	keywords: [
    		"vehicle",
    		"car",
    		"farming",
    		"agriculture"
    	],
    	char: "🚜",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var kick_scooter = {
    	keywords: [
    		"vehicle",
    		"kick",
    		"razor"
    	],
    	char: "🛴",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var motorcycle = {
    	keywords: [
    		"race",
    		"sports",
    		"fast"
    	],
    	char: "🏍",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var bike = {
    	keywords: [
    		"sports",
    		"bicycle",
    		"exercise",
    		"hipster"
    	],
    	char: "🚲",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var motor_scooter = {
    	keywords: [
    		"vehicle",
    		"vespa",
    		"sasha"
    	],
    	char: "🛵",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var rotating_light = {
    	keywords: [
    		"police",
    		"ambulance",
    		"911",
    		"emergency",
    		"alert",
    		"error",
    		"pinged",
    		"law",
    		"legal"
    	],
    	char: "🚨",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var oncoming_police_car = {
    	keywords: [
    		"vehicle",
    		"law",
    		"legal",
    		"enforcement",
    		"911"
    	],
    	char: "🚔",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var oncoming_bus = {
    	keywords: [
    		"vehicle",
    		"transportation"
    	],
    	char: "🚍",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var oncoming_automobile = {
    	keywords: [
    		"car",
    		"vehicle",
    		"transportation"
    	],
    	char: "🚘",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var oncoming_taxi = {
    	keywords: [
    		"vehicle",
    		"cars",
    		"uber"
    	],
    	char: "🚖",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var aerial_tramway = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"ski"
    	],
    	char: "🚡",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var mountain_cableway = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"ski"
    	],
    	char: "🚠",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var suspension_railway = {
    	keywords: [
    		"vehicle",
    		"transportation"
    	],
    	char: "🚟",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var railway_car = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚃",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var train = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"carriage",
    		"public",
    		"travel"
    	],
    	char: "🚋",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var monorail = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚝",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var bullettrain_side = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚄",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var bullettrain_front = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"speed",
    		"fast",
    		"public",
    		"travel"
    	],
    	char: "🚅",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var light_rail = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚈",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var mountain_railway = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚞",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var steam_locomotive = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"train"
    	],
    	char: "🚂",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var train2 = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚆",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var metro = {
    	keywords: [
    		"transportation",
    		"blue-square",
    		"mrt",
    		"underground",
    		"tube"
    	],
    	char: "🚇",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var tram = {
    	keywords: [
    		"transportation",
    		"vehicle"
    	],
    	char: "🚊",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var station = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"public"
    	],
    	char: "🚉",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var flying_saucer = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"ufo"
    	],
    	char: "🛸",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var helicopter = {
    	keywords: [
    		"transportation",
    		"vehicle",
    		"fly"
    	],
    	char: "🚁",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var small_airplane = {
    	keywords: [
    		"flight",
    		"transportation",
    		"fly",
    		"vehicle"
    	],
    	char: "🛩",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var airplane = {
    	keywords: [
    		"vehicle",
    		"transportation",
    		"flight",
    		"fly"
    	],
    	char: "✈️",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var flight_departure = {
    	keywords: [
    		"airport",
    		"flight",
    		"landing"
    	],
    	char: "🛫",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var flight_arrival = {
    	keywords: [
    		"airport",
    		"flight",
    		"boarding"
    	],
    	char: "🛬",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var sailboat = {
    	keywords: [
    		"ship",
    		"summer",
    		"transportation",
    		"water",
    		"sailing"
    	],
    	char: "⛵",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var motor_boat = {
    	keywords: [
    		"ship"
    	],
    	char: "🛥",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var speedboat = {
    	keywords: [
    		"ship",
    		"transportation",
    		"vehicle",
    		"summer"
    	],
    	char: "🚤",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var ferry = {
    	keywords: [
    		"boat",
    		"ship",
    		"yacht"
    	],
    	char: "⛴",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var passenger_ship = {
    	keywords: [
    		"yacht",
    		"cruise",
    		"ferry"
    	],
    	char: "🛳",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var rocket = {
    	keywords: [
    		"launch",
    		"ship",
    		"staffmode",
    		"NASA",
    		"outer space",
    		"outer_space",
    		"fly"
    	],
    	char: "🚀",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var artificial_satellite = {
    	keywords: [
    		"communication",
    		"gps",
    		"orbit",
    		"spaceflight",
    		"NASA",
    		"ISS"
    	],
    	char: "🛰",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var seat = {
    	keywords: [
    		"sit",
    		"airplane",
    		"transport",
    		"bus",
    		"flight",
    		"fly"
    	],
    	char: "💺",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var canoe = {
    	keywords: [
    		"boat",
    		"paddle",
    		"water",
    		"ship"
    	],
    	char: "🛶",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var anchor = {
    	keywords: [
    		"ship",
    		"ferry",
    		"sea",
    		"boat"
    	],
    	char: "⚓",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var construction = {
    	keywords: [
    		"wip",
    		"progress",
    		"caution",
    		"warning"
    	],
    	char: "🚧",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var fuelpump = {
    	keywords: [
    		"gas station",
    		"petroleum"
    	],
    	char: "⛽",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var busstop = {
    	keywords: [
    		"transportation",
    		"wait"
    	],
    	char: "🚏",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var vertical_traffic_light = {
    	keywords: [
    		"transportation",
    		"driving"
    	],
    	char: "🚦",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var traffic_light = {
    	keywords: [
    		"transportation",
    		"signal"
    	],
    	char: "🚥",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var checkered_flag = {
    	keywords: [
    		"contest",
    		"finishline",
    		"race",
    		"gokart"
    	],
    	char: "🏁",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var ship = {
    	keywords: [
    		"transportation",
    		"titanic",
    		"deploy"
    	],
    	char: "🚢",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var ferris_wheel = {
    	keywords: [
    		"photo",
    		"carnival",
    		"londoneye"
    	],
    	char: "🎡",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var roller_coaster = {
    	keywords: [
    		"carnival",
    		"playground",
    		"photo",
    		"fun"
    	],
    	char: "🎢",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var carousel_horse = {
    	keywords: [
    		"photo",
    		"carnival"
    	],
    	char: "🎠",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var building_construction = {
    	keywords: [
    		"wip",
    		"working",
    		"progress"
    	],
    	char: "🏗",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var foggy = {
    	keywords: [
    		"photo",
    		"mountain"
    	],
    	char: "🌁",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var tokyo_tower = {
    	keywords: [
    		"photo",
    		"japanese"
    	],
    	char: "🗼",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var factory = {
    	keywords: [
    		"building",
    		"industry",
    		"pollution",
    		"smoke"
    	],
    	char: "🏭",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var fountain = {
    	keywords: [
    		"photo",
    		"summer",
    		"water",
    		"fresh"
    	],
    	char: "⛲",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var rice_scene = {
    	keywords: [
    		"photo",
    		"japan",
    		"asia",
    		"tsukimi"
    	],
    	char: "🎑",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var mountain = {
    	keywords: [
    		"photo",
    		"nature",
    		"environment"
    	],
    	char: "⛰",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var mountain_snow = {
    	keywords: [
    		"photo",
    		"nature",
    		"environment",
    		"winter",
    		"cold"
    	],
    	char: "🏔",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var mount_fuji = {
    	keywords: [
    		"photo",
    		"mountain",
    		"nature",
    		"japanese"
    	],
    	char: "🗻",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var volcano = {
    	keywords: [
    		"photo",
    		"nature",
    		"disaster"
    	],
    	char: "🌋",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var japan = {
    	keywords: [
    		"nation",
    		"country",
    		"japanese",
    		"asia"
    	],
    	char: "🗾",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var camping = {
    	keywords: [
    		"photo",
    		"outdoors",
    		"tent"
    	],
    	char: "🏕",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var tent = {
    	keywords: [
    		"photo",
    		"camping",
    		"outdoors"
    	],
    	char: "⛺",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var national_park = {
    	keywords: [
    		"photo",
    		"environment",
    		"nature"
    	],
    	char: "🏞",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var motorway = {
    	keywords: [
    		"road",
    		"cupertino",
    		"interstate",
    		"highway"
    	],
    	char: "🛣",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var railway_track = {
    	keywords: [
    		"train",
    		"transportation"
    	],
    	char: "🛤",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var sunrise = {
    	keywords: [
    		"morning",
    		"view",
    		"vacation",
    		"photo"
    	],
    	char: "🌅",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var sunrise_over_mountains = {
    	keywords: [
    		"view",
    		"vacation",
    		"photo"
    	],
    	char: "🌄",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var desert = {
    	keywords: [
    		"photo",
    		"warm",
    		"saharah"
    	],
    	char: "🏜",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var beach_umbrella = {
    	keywords: [
    		"weather",
    		"summer",
    		"sunny",
    		"sand",
    		"mojito"
    	],
    	char: "🏖",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var desert_island = {
    	keywords: [
    		"photo",
    		"tropical",
    		"mojito"
    	],
    	char: "🏝",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var city_sunrise = {
    	keywords: [
    		"photo",
    		"good morning",
    		"dawn"
    	],
    	char: "🌇",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var city_sunset = {
    	keywords: [
    		"photo",
    		"evening",
    		"sky",
    		"buildings"
    	],
    	char: "🌆",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var cityscape = {
    	keywords: [
    		"photo",
    		"night life",
    		"urban"
    	],
    	char: "🏙",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var night_with_stars = {
    	keywords: [
    		"evening",
    		"city",
    		"downtown"
    	],
    	char: "🌃",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var bridge_at_night = {
    	keywords: [
    		"photo",
    		"sanfrancisco"
    	],
    	char: "🌉",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var milky_way = {
    	keywords: [
    		"photo",
    		"space",
    		"stars"
    	],
    	char: "🌌",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var stars = {
    	keywords: [
    		"night",
    		"photo"
    	],
    	char: "🌠",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var sparkler = {
    	keywords: [
    		"stars",
    		"night",
    		"shine"
    	],
    	char: "🎇",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var fireworks = {
    	keywords: [
    		"photo",
    		"festival",
    		"carnival",
    		"congratulations"
    	],
    	char: "🎆",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var rainbow = {
    	keywords: [
    		"nature",
    		"happy",
    		"unicorn_face",
    		"photo",
    		"sky",
    		"spring"
    	],
    	char: "🌈",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var houses = {
    	keywords: [
    		"buildings",
    		"photo"
    	],
    	char: "🏘",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var european_castle = {
    	keywords: [
    		"building",
    		"royalty",
    		"history"
    	],
    	char: "🏰",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var japanese_castle = {
    	keywords: [
    		"photo",
    		"building"
    	],
    	char: "🏯",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var stadium = {
    	keywords: [
    		"photo",
    		"place",
    		"sports",
    		"concert",
    		"venue"
    	],
    	char: "🏟",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var statue_of_liberty = {
    	keywords: [
    		"american",
    		"newyork"
    	],
    	char: "🗽",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var house = {
    	keywords: [
    		"building",
    		"home"
    	],
    	char: "🏠",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var house_with_garden = {
    	keywords: [
    		"home",
    		"plant",
    		"nature"
    	],
    	char: "🏡",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var derelict_house = {
    	keywords: [
    		"abandon",
    		"evict",
    		"broken",
    		"building"
    	],
    	char: "🏚",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var office = {
    	keywords: [
    		"building",
    		"bureau",
    		"work"
    	],
    	char: "🏢",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var department_store = {
    	keywords: [
    		"building",
    		"shopping",
    		"mall"
    	],
    	char: "🏬",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var post_office = {
    	keywords: [
    		"building",
    		"envelope",
    		"communication"
    	],
    	char: "🏣",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var european_post_office = {
    	keywords: [
    		"building",
    		"email"
    	],
    	char: "🏤",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var hospital = {
    	keywords: [
    		"building",
    		"health",
    		"surgery",
    		"doctor"
    	],
    	char: "🏥",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var bank = {
    	keywords: [
    		"building",
    		"money",
    		"sales",
    		"cash",
    		"business",
    		"enterprise"
    	],
    	char: "🏦",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var hotel = {
    	keywords: [
    		"building",
    		"accomodation",
    		"checkin"
    	],
    	char: "🏨",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var convenience_store = {
    	keywords: [
    		"building",
    		"shopping",
    		"groceries"
    	],
    	char: "🏪",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var school = {
    	keywords: [
    		"building",
    		"student",
    		"education",
    		"learn",
    		"teach"
    	],
    	char: "🏫",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var love_hotel = {
    	keywords: [
    		"like",
    		"affection",
    		"dating"
    	],
    	char: "🏩",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var wedding = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"couple",
    		"marriage",
    		"bride",
    		"groom"
    	],
    	char: "💒",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var classical_building = {
    	keywords: [
    		"art",
    		"culture",
    		"history"
    	],
    	char: "🏛",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var church = {
    	keywords: [
    		"building",
    		"religion",
    		"christ"
    	],
    	char: "⛪",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var mosque = {
    	keywords: [
    		"islam",
    		"worship",
    		"minaret"
    	],
    	char: "🕌",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var synagogue = {
    	keywords: [
    		"judaism",
    		"worship",
    		"temple",
    		"jewish"
    	],
    	char: "🕍",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var kaaba = {
    	keywords: [
    		"mecca",
    		"mosque",
    		"islam"
    	],
    	char: "🕋",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var shinto_shrine = {
    	keywords: [
    		"temple",
    		"japan",
    		"kyoto"
    	],
    	char: "⛩",
    	fitzpatrick_scale: false,
    	category: "travel_and_places"
    };
    var watch = {
    	keywords: [
    		"time",
    		"accessories"
    	],
    	char: "⌚",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var iphone = {
    	keywords: [
    		"technology",
    		"apple",
    		"gadgets",
    		"dial"
    	],
    	char: "📱",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var calling = {
    	keywords: [
    		"iphone",
    		"incoming"
    	],
    	char: "📲",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var computer = {
    	keywords: [
    		"technology",
    		"laptop",
    		"screen",
    		"display",
    		"monitor"
    	],
    	char: "💻",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var keyboard = {
    	keywords: [
    		"technology",
    		"computer",
    		"type",
    		"input",
    		"text"
    	],
    	char: "⌨",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var desktop_computer = {
    	keywords: [
    		"technology",
    		"computing",
    		"screen"
    	],
    	char: "🖥",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var printer = {
    	keywords: [
    		"paper",
    		"ink"
    	],
    	char: "🖨",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var computer_mouse = {
    	keywords: [
    		"click"
    	],
    	char: "🖱",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var trackball = {
    	keywords: [
    		"technology",
    		"trackpad"
    	],
    	char: "🖲",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var joystick = {
    	keywords: [
    		"game",
    		"play"
    	],
    	char: "🕹",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var clamp = {
    	keywords: [
    		"tool"
    	],
    	char: "🗜",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var minidisc = {
    	keywords: [
    		"technology",
    		"record",
    		"data",
    		"disk",
    		"90s"
    	],
    	char: "💽",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var floppy_disk = {
    	keywords: [
    		"oldschool",
    		"technology",
    		"save",
    		"90s",
    		"80s"
    	],
    	char: "💾",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var cd = {
    	keywords: [
    		"technology",
    		"dvd",
    		"disk",
    		"disc",
    		"90s"
    	],
    	char: "💿",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var dvd = {
    	keywords: [
    		"cd",
    		"disk",
    		"disc"
    	],
    	char: "📀",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var vhs = {
    	keywords: [
    		"record",
    		"video",
    		"oldschool",
    		"90s",
    		"80s"
    	],
    	char: "📼",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var camera = {
    	keywords: [
    		"gadgets",
    		"photography"
    	],
    	char: "📷",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var camera_flash = {
    	keywords: [
    		"photography",
    		"gadgets"
    	],
    	char: "📸",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var video_camera = {
    	keywords: [
    		"film",
    		"record"
    	],
    	char: "📹",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var movie_camera = {
    	keywords: [
    		"film",
    		"record"
    	],
    	char: "🎥",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var film_projector = {
    	keywords: [
    		"video",
    		"tape",
    		"record",
    		"movie"
    	],
    	char: "📽",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var film_strip = {
    	keywords: [
    		"movie"
    	],
    	char: "🎞",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var telephone_receiver = {
    	keywords: [
    		"technology",
    		"communication",
    		"dial"
    	],
    	char: "📞",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var phone = {
    	keywords: [
    		"technology",
    		"communication",
    		"dial",
    		"telephone"
    	],
    	char: "☎️",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pager = {
    	keywords: [
    		"bbcall",
    		"oldschool",
    		"90s"
    	],
    	char: "📟",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var fax = {
    	keywords: [
    		"communication",
    		"technology"
    	],
    	char: "📠",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var tv = {
    	keywords: [
    		"technology",
    		"program",
    		"oldschool",
    		"show",
    		"television"
    	],
    	char: "📺",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var radio = {
    	keywords: [
    		"communication",
    		"music",
    		"podcast",
    		"program"
    	],
    	char: "📻",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var studio_microphone = {
    	keywords: [
    		"sing",
    		"recording",
    		"artist",
    		"talkshow"
    	],
    	char: "🎙",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var level_slider = {
    	keywords: [
    		"scale"
    	],
    	char: "🎚",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var control_knobs = {
    	keywords: [
    		"dial"
    	],
    	char: "🎛",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var compass = {
    	keywords: [
    		"magnetic",
    		"navigation",
    		"orienteering"
    	],
    	char: "🧭",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var stopwatch = {
    	keywords: [
    		"time",
    		"deadline"
    	],
    	char: "⏱",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var timer_clock = {
    	keywords: [
    		"alarm"
    	],
    	char: "⏲",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var alarm_clock = {
    	keywords: [
    		"time",
    		"wake"
    	],
    	char: "⏰",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mantelpiece_clock = {
    	keywords: [
    		"time"
    	],
    	char: "🕰",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hourglass_flowing_sand = {
    	keywords: [
    		"oldschool",
    		"time",
    		"countdown"
    	],
    	char: "⏳",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hourglass = {
    	keywords: [
    		"time",
    		"clock",
    		"oldschool",
    		"limit",
    		"exam",
    		"quiz",
    		"test"
    	],
    	char: "⌛",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var satellite = {
    	keywords: [
    		"communication",
    		"future",
    		"radio",
    		"space"
    	],
    	char: "📡",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var battery = {
    	keywords: [
    		"power",
    		"energy",
    		"sustain"
    	],
    	char: "🔋",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var electric_plug = {
    	keywords: [
    		"charger",
    		"power"
    	],
    	char: "🔌",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bulb = {
    	keywords: [
    		"light",
    		"electricity",
    		"idea"
    	],
    	char: "💡",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var flashlight = {
    	keywords: [
    		"dark",
    		"camping",
    		"sight",
    		"night"
    	],
    	char: "🔦",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var candle = {
    	keywords: [
    		"fire",
    		"wax"
    	],
    	char: "🕯",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var fire_extinguisher = {
    	keywords: [
    		"quench"
    	],
    	char: "🧯",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var wastebasket = {
    	keywords: [
    		"bin",
    		"trash",
    		"rubbish",
    		"garbage",
    		"toss"
    	],
    	char: "🗑",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var oil_drum = {
    	keywords: [
    		"barrell"
    	],
    	char: "🛢",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var money_with_wings = {
    	keywords: [
    		"dollar",
    		"bills",
    		"payment",
    		"sale"
    	],
    	char: "💸",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var dollar = {
    	keywords: [
    		"money",
    		"sales",
    		"bill",
    		"currency"
    	],
    	char: "💵",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var yen = {
    	keywords: [
    		"money",
    		"sales",
    		"japanese",
    		"dollar",
    		"currency"
    	],
    	char: "💴",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var euro = {
    	keywords: [
    		"money",
    		"sales",
    		"dollar",
    		"currency"
    	],
    	char: "💶",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pound = {
    	keywords: [
    		"british",
    		"sterling",
    		"money",
    		"sales",
    		"bills",
    		"uk",
    		"england",
    		"currency"
    	],
    	char: "💷",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var moneybag = {
    	keywords: [
    		"dollar",
    		"payment",
    		"coins",
    		"sale"
    	],
    	char: "💰",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var credit_card = {
    	keywords: [
    		"money",
    		"sales",
    		"dollar",
    		"bill",
    		"payment",
    		"shopping"
    	],
    	char: "💳",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var gem = {
    	keywords: [
    		"blue",
    		"ruby",
    		"diamond",
    		"jewelry"
    	],
    	char: "💎",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var balance_scale = {
    	keywords: [
    		"law",
    		"fairness",
    		"weight"
    	],
    	char: "⚖",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var toolbox = {
    	keywords: [
    		"tools",
    		"diy",
    		"fix",
    		"maintainer",
    		"mechanic"
    	],
    	char: "🧰",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var wrench = {
    	keywords: [
    		"tools",
    		"diy",
    		"ikea",
    		"fix",
    		"maintainer"
    	],
    	char: "🔧",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hammer = {
    	keywords: [
    		"tools",
    		"build",
    		"create"
    	],
    	char: "🔨",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hammer_and_pick = {
    	keywords: [
    		"tools",
    		"build",
    		"create"
    	],
    	char: "⚒",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hammer_and_wrench = {
    	keywords: [
    		"tools",
    		"build",
    		"create"
    	],
    	char: "🛠",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pick = {
    	keywords: [
    		"tools",
    		"dig"
    	],
    	char: "⛏",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var nut_and_bolt = {
    	keywords: [
    		"handy",
    		"tools",
    		"fix"
    	],
    	char: "🔩",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var gear = {
    	keywords: [
    		"cog"
    	],
    	char: "⚙",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var brick = {
    	keywords: [
    		"bricks"
    	],
    	char: "🧱",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var chains = {
    	keywords: [
    		"lock",
    		"arrest"
    	],
    	char: "⛓",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var magnet = {
    	keywords: [
    		"attraction",
    		"magnetic"
    	],
    	char: "🧲",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var gun = {
    	keywords: [
    		"violence",
    		"weapon",
    		"pistol",
    		"revolver"
    	],
    	char: "🔫",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bomb = {
    	keywords: [
    		"boom",
    		"explode",
    		"explosion",
    		"terrorism"
    	],
    	char: "💣",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var firecracker = {
    	keywords: [
    		"dynamite",
    		"boom",
    		"explode",
    		"explosion",
    		"explosive"
    	],
    	char: "🧨",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hocho = {
    	keywords: [
    		"knife",
    		"blade",
    		"cutlery",
    		"kitchen",
    		"weapon"
    	],
    	char: "🔪",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var dagger = {
    	keywords: [
    		"weapon"
    	],
    	char: "🗡",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var crossed_swords = {
    	keywords: [
    		"weapon"
    	],
    	char: "⚔",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var shield = {
    	keywords: [
    		"protection",
    		"security"
    	],
    	char: "🛡",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var smoking = {
    	keywords: [
    		"kills",
    		"tobacco",
    		"cigarette",
    		"joint",
    		"smoke"
    	],
    	char: "🚬",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var skull_and_crossbones = {
    	keywords: [
    		"poison",
    		"danger",
    		"deadly",
    		"scary",
    		"death",
    		"pirate",
    		"evil"
    	],
    	char: "☠",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var coffin = {
    	keywords: [
    		"vampire",
    		"dead",
    		"die",
    		"death",
    		"rip",
    		"graveyard",
    		"cemetery",
    		"casket",
    		"funeral",
    		"box"
    	],
    	char: "⚰",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var funeral_urn = {
    	keywords: [
    		"dead",
    		"die",
    		"death",
    		"rip",
    		"ashes"
    	],
    	char: "⚱",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var amphora = {
    	keywords: [
    		"vase",
    		"jar"
    	],
    	char: "🏺",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var crystal_ball = {
    	keywords: [
    		"disco",
    		"party",
    		"magic",
    		"circus",
    		"fortune_teller"
    	],
    	char: "🔮",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var prayer_beads = {
    	keywords: [
    		"dhikr",
    		"religious"
    	],
    	char: "📿",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var nazar_amulet = {
    	keywords: [
    		"bead",
    		"charm"
    	],
    	char: "🧿",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var barber = {
    	keywords: [
    		"hair",
    		"salon",
    		"style"
    	],
    	char: "💈",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var alembic = {
    	keywords: [
    		"distilling",
    		"science",
    		"experiment",
    		"chemistry"
    	],
    	char: "⚗",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var telescope = {
    	keywords: [
    		"stars",
    		"space",
    		"zoom",
    		"science",
    		"astronomy"
    	],
    	char: "🔭",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var microscope = {
    	keywords: [
    		"laboratory",
    		"experiment",
    		"zoomin",
    		"science",
    		"study"
    	],
    	char: "🔬",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var hole = {
    	keywords: [
    		"embarrassing"
    	],
    	char: "🕳",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pill = {
    	keywords: [
    		"health",
    		"medicine",
    		"doctor",
    		"pharmacy",
    		"drug"
    	],
    	char: "💊",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var syringe = {
    	keywords: [
    		"health",
    		"hospital",
    		"drugs",
    		"blood",
    		"medicine",
    		"needle",
    		"doctor",
    		"nurse"
    	],
    	char: "💉",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var dna = {
    	keywords: [
    		"biologist",
    		"genetics",
    		"life"
    	],
    	char: "🧬",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var microbe = {
    	keywords: [
    		"amoeba",
    		"bacteria",
    		"germs"
    	],
    	char: "🦠",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var petri_dish = {
    	keywords: [
    		"bacteria",
    		"biology",
    		"culture",
    		"lab"
    	],
    	char: "🧫",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var test_tube = {
    	keywords: [
    		"chemistry",
    		"experiment",
    		"lab",
    		"science"
    	],
    	char: "🧪",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var thermometer = {
    	keywords: [
    		"weather",
    		"temperature",
    		"hot",
    		"cold"
    	],
    	char: "🌡",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var broom = {
    	keywords: [
    		"cleaning",
    		"sweeping",
    		"witch"
    	],
    	char: "🧹",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var basket = {
    	keywords: [
    		"laundry"
    	],
    	char: "🧺",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var toilet_paper = {
    	keywords: [
    		"roll"
    	],
    	char: "🧻",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var label = {
    	keywords: [
    		"sale",
    		"tag"
    	],
    	char: "🏷",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bookmark = {
    	keywords: [
    		"favorite",
    		"label",
    		"save"
    	],
    	char: "🔖",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var toilet = {
    	keywords: [
    		"restroom",
    		"wc",
    		"washroom",
    		"bathroom",
    		"potty"
    	],
    	char: "🚽",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var shower = {
    	keywords: [
    		"clean",
    		"water",
    		"bathroom"
    	],
    	char: "🚿",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bathtub = {
    	keywords: [
    		"clean",
    		"shower",
    		"bathroom"
    	],
    	char: "🛁",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var soap = {
    	keywords: [
    		"bar",
    		"bathing",
    		"cleaning",
    		"lather"
    	],
    	char: "🧼",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var sponge = {
    	keywords: [
    		"absorbing",
    		"cleaning",
    		"porous"
    	],
    	char: "🧽",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var lotion_bottle = {
    	keywords: [
    		"moisturizer",
    		"sunscreen"
    	],
    	char: "🧴",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var key = {
    	keywords: [
    		"lock",
    		"door",
    		"password"
    	],
    	char: "🔑",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var old_key = {
    	keywords: [
    		"lock",
    		"door",
    		"password"
    	],
    	char: "🗝",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var couch_and_lamp = {
    	keywords: [
    		"read",
    		"chill"
    	],
    	char: "🛋",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var sleeping_bed = {
    	keywords: [
    		"bed",
    		"rest"
    	],
    	char: "🛌",
    	fitzpatrick_scale: true,
    	category: "objects"
    };
    var bed = {
    	keywords: [
    		"sleep",
    		"rest"
    	],
    	char: "🛏",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var door = {
    	keywords: [
    		"house",
    		"entry",
    		"exit"
    	],
    	char: "🚪",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bellhop_bell = {
    	keywords: [
    		"service"
    	],
    	char: "🛎",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var teddy_bear = {
    	keywords: [
    		"plush",
    		"stuffed"
    	],
    	char: "🧸",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var framed_picture = {
    	keywords: [
    		"photography"
    	],
    	char: "🖼",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var world_map = {
    	keywords: [
    		"location",
    		"direction"
    	],
    	char: "🗺",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var parasol_on_ground = {
    	keywords: [
    		"weather",
    		"summer"
    	],
    	char: "⛱",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var moyai = {
    	keywords: [
    		"rock",
    		"easter island",
    		"moai"
    	],
    	char: "🗿",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var shopping = {
    	keywords: [
    		"mall",
    		"buy",
    		"purchase"
    	],
    	char: "🛍",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var shopping_cart = {
    	keywords: [
    		"trolley"
    	],
    	char: "🛒",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var balloon = {
    	keywords: [
    		"party",
    		"celebration",
    		"birthday",
    		"circus"
    	],
    	char: "🎈",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var flags = {
    	keywords: [
    		"fish",
    		"japanese",
    		"koinobori",
    		"carp",
    		"banner"
    	],
    	char: "🎏",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var ribbon = {
    	keywords: [
    		"decoration",
    		"pink",
    		"girl",
    		"bowtie"
    	],
    	char: "🎀",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var gift = {
    	keywords: [
    		"present",
    		"birthday",
    		"christmas",
    		"xmas"
    	],
    	char: "🎁",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var confetti_ball = {
    	keywords: [
    		"festival",
    		"party",
    		"birthday",
    		"circus"
    	],
    	char: "🎊",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var tada = {
    	keywords: [
    		"party",
    		"congratulations",
    		"birthday",
    		"magic",
    		"circus",
    		"celebration"
    	],
    	char: "🎉",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var dolls = {
    	keywords: [
    		"japanese",
    		"toy",
    		"kimono"
    	],
    	char: "🎎",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var wind_chime = {
    	keywords: [
    		"nature",
    		"ding",
    		"spring",
    		"bell"
    	],
    	char: "🎐",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var crossed_flags = {
    	keywords: [
    		"japanese",
    		"nation",
    		"country",
    		"border"
    	],
    	char: "🎌",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var izakaya_lantern = {
    	keywords: [
    		"light",
    		"paper",
    		"halloween",
    		"spooky"
    	],
    	char: "🏮",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var red_envelope = {
    	keywords: [
    		"gift"
    	],
    	char: "🧧",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var email = {
    	keywords: [
    		"letter",
    		"postal",
    		"inbox",
    		"communication"
    	],
    	char: "✉️",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var envelope_with_arrow = {
    	keywords: [
    		"email",
    		"communication"
    	],
    	char: "📩",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var incoming_envelope = {
    	keywords: [
    		"email",
    		"inbox"
    	],
    	char: "📨",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var love_letter = {
    	keywords: [
    		"email",
    		"like",
    		"affection",
    		"envelope",
    		"valentines"
    	],
    	char: "💌",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var postbox = {
    	keywords: [
    		"email",
    		"letter",
    		"envelope"
    	],
    	char: "📮",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mailbox_closed = {
    	keywords: [
    		"email",
    		"communication",
    		"inbox"
    	],
    	char: "📪",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mailbox = {
    	keywords: [
    		"email",
    		"inbox",
    		"communication"
    	],
    	char: "📫",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mailbox_with_mail = {
    	keywords: [
    		"email",
    		"inbox",
    		"communication"
    	],
    	char: "📬",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mailbox_with_no_mail = {
    	keywords: [
    		"email",
    		"inbox"
    	],
    	char: "📭",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var postal_horn = {
    	keywords: [
    		"instrument",
    		"music"
    	],
    	char: "📯",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var inbox_tray = {
    	keywords: [
    		"email",
    		"documents"
    	],
    	char: "📥",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var outbox_tray = {
    	keywords: [
    		"inbox",
    		"email"
    	],
    	char: "📤",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var scroll = {
    	keywords: [
    		"documents",
    		"ancient",
    		"history",
    		"paper"
    	],
    	char: "📜",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var page_with_curl = {
    	keywords: [
    		"documents",
    		"office",
    		"paper"
    	],
    	char: "📃",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bookmark_tabs = {
    	keywords: [
    		"favorite",
    		"save",
    		"order",
    		"tidy"
    	],
    	char: "📑",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var receipt = {
    	keywords: [
    		"accounting",
    		"expenses"
    	],
    	char: "🧾",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var bar_chart = {
    	keywords: [
    		"graph",
    		"presentation",
    		"stats"
    	],
    	char: "📊",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var chart_with_upwards_trend = {
    	keywords: [
    		"graph",
    		"presentation",
    		"stats",
    		"recovery",
    		"business",
    		"economics",
    		"money",
    		"sales",
    		"good",
    		"success"
    	],
    	char: "📈",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var chart_with_downwards_trend = {
    	keywords: [
    		"graph",
    		"presentation",
    		"stats",
    		"recession",
    		"business",
    		"economics",
    		"money",
    		"sales",
    		"bad",
    		"failure"
    	],
    	char: "📉",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var page_facing_up = {
    	keywords: [
    		"documents",
    		"office",
    		"paper",
    		"information"
    	],
    	char: "📄",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var date = {
    	keywords: [
    		"calendar",
    		"schedule"
    	],
    	char: "📅",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var calendar = {
    	keywords: [
    		"schedule",
    		"date",
    		"planning"
    	],
    	char: "📆",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var spiral_calendar = {
    	keywords: [
    		"date",
    		"schedule",
    		"planning"
    	],
    	char: "🗓",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var card_index = {
    	keywords: [
    		"business",
    		"stationery"
    	],
    	char: "📇",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var card_file_box = {
    	keywords: [
    		"business",
    		"stationery"
    	],
    	char: "🗃",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var ballot_box = {
    	keywords: [
    		"election",
    		"vote"
    	],
    	char: "🗳",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var file_cabinet = {
    	keywords: [
    		"filing",
    		"organizing"
    	],
    	char: "🗄",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var clipboard = {
    	keywords: [
    		"stationery",
    		"documents"
    	],
    	char: "📋",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var spiral_notepad = {
    	keywords: [
    		"memo",
    		"stationery"
    	],
    	char: "🗒",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var file_folder = {
    	keywords: [
    		"documents",
    		"business",
    		"office"
    	],
    	char: "📁",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var open_file_folder = {
    	keywords: [
    		"documents",
    		"load"
    	],
    	char: "📂",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var card_index_dividers = {
    	keywords: [
    		"organizing",
    		"business",
    		"stationery"
    	],
    	char: "🗂",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var newspaper_roll = {
    	keywords: [
    		"press",
    		"headline"
    	],
    	char: "🗞",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var newspaper = {
    	keywords: [
    		"press",
    		"headline"
    	],
    	char: "📰",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var notebook = {
    	keywords: [
    		"stationery",
    		"record",
    		"notes",
    		"paper",
    		"study"
    	],
    	char: "📓",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var closed_book = {
    	keywords: [
    		"read",
    		"library",
    		"knowledge",
    		"textbook",
    		"learn"
    	],
    	char: "📕",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var green_book = {
    	keywords: [
    		"read",
    		"library",
    		"knowledge",
    		"study"
    	],
    	char: "📗",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var blue_book = {
    	keywords: [
    		"read",
    		"library",
    		"knowledge",
    		"learn",
    		"study"
    	],
    	char: "📘",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var orange_book = {
    	keywords: [
    		"read",
    		"library",
    		"knowledge",
    		"textbook",
    		"study"
    	],
    	char: "📙",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var notebook_with_decorative_cover = {
    	keywords: [
    		"classroom",
    		"notes",
    		"record",
    		"paper",
    		"study"
    	],
    	char: "📔",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var ledger = {
    	keywords: [
    		"notes",
    		"paper"
    	],
    	char: "📒",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var books = {
    	keywords: [
    		"literature",
    		"library",
    		"study"
    	],
    	char: "📚",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var open_book = {
    	keywords: [
    		"book",
    		"read",
    		"library",
    		"knowledge",
    		"literature",
    		"learn",
    		"study"
    	],
    	char: "📖",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var safety_pin = {
    	keywords: [
    		"diaper"
    	],
    	char: "🧷",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var link = {
    	keywords: [
    		"rings",
    		"url"
    	],
    	char: "🔗",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var paperclip = {
    	keywords: [
    		"documents",
    		"stationery"
    	],
    	char: "📎",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var paperclips = {
    	keywords: [
    		"documents",
    		"stationery"
    	],
    	char: "🖇",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var scissors = {
    	keywords: [
    		"stationery",
    		"cut"
    	],
    	char: "✂️",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var triangular_ruler = {
    	keywords: [
    		"stationery",
    		"math",
    		"architect",
    		"sketch"
    	],
    	char: "📐",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var straight_ruler = {
    	keywords: [
    		"stationery",
    		"calculate",
    		"length",
    		"math",
    		"school",
    		"drawing",
    		"architect",
    		"sketch"
    	],
    	char: "📏",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var abacus = {
    	keywords: [
    		"calculation"
    	],
    	char: "🧮",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pushpin = {
    	keywords: [
    		"stationery",
    		"mark",
    		"here"
    	],
    	char: "📌",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var round_pushpin = {
    	keywords: [
    		"stationery",
    		"location",
    		"map",
    		"here"
    	],
    	char: "📍",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var triangular_flag_on_post = {
    	keywords: [
    		"mark",
    		"milestone",
    		"place"
    	],
    	char: "🚩",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var white_flag = {
    	keywords: [
    		"losing",
    		"loser",
    		"lost",
    		"surrender",
    		"give up",
    		"fail"
    	],
    	char: "🏳",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var black_flag = {
    	keywords: [
    		"pirate"
    	],
    	char: "🏴",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var rainbow_flag = {
    	keywords: [
    		"flag",
    		"rainbow",
    		"pride",
    		"gay",
    		"lgbt",
    		"glbt",
    		"queer",
    		"homosexual",
    		"lesbian",
    		"bisexual",
    		"transgender"
    	],
    	char: "🏳️‍🌈",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var closed_lock_with_key = {
    	keywords: [
    		"security",
    		"privacy"
    	],
    	char: "🔐",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var lock = {
    	keywords: [
    		"security",
    		"password",
    		"padlock"
    	],
    	char: "🔒",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var unlock = {
    	keywords: [
    		"privacy",
    		"security"
    	],
    	char: "🔓",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var lock_with_ink_pen = {
    	keywords: [
    		"security",
    		"secret"
    	],
    	char: "🔏",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pen = {
    	keywords: [
    		"stationery",
    		"writing",
    		"write"
    	],
    	char: "🖊",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var fountain_pen = {
    	keywords: [
    		"stationery",
    		"writing",
    		"write"
    	],
    	char: "🖋",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var black_nib = {
    	keywords: [
    		"pen",
    		"stationery",
    		"writing",
    		"write"
    	],
    	char: "✒️",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var memo = {
    	keywords: [
    		"write",
    		"documents",
    		"stationery",
    		"pencil",
    		"paper",
    		"writing",
    		"legal",
    		"exam",
    		"quiz",
    		"test",
    		"study",
    		"compose"
    	],
    	char: "📝",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var pencil2 = {
    	keywords: [
    		"stationery",
    		"write",
    		"paper",
    		"writing",
    		"school",
    		"study"
    	],
    	char: "✏️",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var crayon = {
    	keywords: [
    		"drawing",
    		"creativity"
    	],
    	char: "🖍",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var paintbrush = {
    	keywords: [
    		"drawing",
    		"creativity",
    		"art"
    	],
    	char: "🖌",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mag = {
    	keywords: [
    		"search",
    		"zoom",
    		"find",
    		"detective"
    	],
    	char: "🔍",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var mag_right = {
    	keywords: [
    		"search",
    		"zoom",
    		"find",
    		"detective"
    	],
    	char: "🔎",
    	fitzpatrick_scale: false,
    	category: "objects"
    };
    var heart = {
    	keywords: [
    		"love",
    		"like",
    		"valentines"
    	],
    	char: "❤️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var orange_heart = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "🧡",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var yellow_heart = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💛",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var green_heart = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💚",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var blue_heart = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💙",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var purple_heart = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💜",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_heart = {
    	keywords: [
    		"evil"
    	],
    	char: "🖤",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var broken_heart = {
    	keywords: [
    		"sad",
    		"sorry",
    		"break",
    		"heart",
    		"heartbreak"
    	],
    	char: "💔",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_heart_exclamation = {
    	keywords: [
    		"decoration",
    		"love"
    	],
    	char: "❣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var two_hearts = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines",
    		"heart"
    	],
    	char: "💕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var revolving_hearts = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💞",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heartbeat = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines",
    		"pink",
    		"heart"
    	],
    	char: "💓",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heartpulse = {
    	keywords: [
    		"like",
    		"love",
    		"affection",
    		"valentines",
    		"pink"
    	],
    	char: "💗",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var sparkling_heart = {
    	keywords: [
    		"love",
    		"like",
    		"affection",
    		"valentines"
    	],
    	char: "💖",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var cupid = {
    	keywords: [
    		"love",
    		"like",
    		"heart",
    		"affection",
    		"valentines"
    	],
    	char: "💘",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var gift_heart = {
    	keywords: [
    		"love",
    		"valentines"
    	],
    	char: "💝",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heart_decoration = {
    	keywords: [
    		"purple-square",
    		"love",
    		"like"
    	],
    	char: "💟",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var peace_symbol = {
    	keywords: [
    		"hippie"
    	],
    	char: "☮",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var latin_cross = {
    	keywords: [
    		"christianity"
    	],
    	char: "✝",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var star_and_crescent = {
    	keywords: [
    		"islam"
    	],
    	char: "☪",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var om = {
    	keywords: [
    		"hinduism",
    		"buddhism",
    		"sikhism",
    		"jainism"
    	],
    	char: "🕉",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var wheel_of_dharma = {
    	keywords: [
    		"hinduism",
    		"buddhism",
    		"sikhism",
    		"jainism"
    	],
    	char: "☸",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var star_of_david = {
    	keywords: [
    		"judaism"
    	],
    	char: "✡",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var six_pointed_star = {
    	keywords: [
    		"purple-square",
    		"religion",
    		"jewish",
    		"hexagram"
    	],
    	char: "🔯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var menorah = {
    	keywords: [
    		"hanukkah",
    		"candles",
    		"jewish"
    	],
    	char: "🕎",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var yin_yang = {
    	keywords: [
    		"balance"
    	],
    	char: "☯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var orthodox_cross = {
    	keywords: [
    		"suppedaneum",
    		"religion"
    	],
    	char: "☦",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var place_of_worship = {
    	keywords: [
    		"religion",
    		"church",
    		"temple",
    		"prayer"
    	],
    	char: "🛐",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var ophiuchus = {
    	keywords: [
    		"sign",
    		"purple-square",
    		"constellation",
    		"astrology"
    	],
    	char: "⛎",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var aries = {
    	keywords: [
    		"sign",
    		"purple-square",
    		"zodiac",
    		"astrology"
    	],
    	char: "♈",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var taurus = {
    	keywords: [
    		"purple-square",
    		"sign",
    		"zodiac",
    		"astrology"
    	],
    	char: "♉",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var gemini = {
    	keywords: [
    		"sign",
    		"zodiac",
    		"purple-square",
    		"astrology"
    	],
    	char: "♊",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var cancer = {
    	keywords: [
    		"sign",
    		"zodiac",
    		"purple-square",
    		"astrology"
    	],
    	char: "♋",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var leo = {
    	keywords: [
    		"sign",
    		"purple-square",
    		"zodiac",
    		"astrology"
    	],
    	char: "♌",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var virgo = {
    	keywords: [
    		"sign",
    		"zodiac",
    		"purple-square",
    		"astrology"
    	],
    	char: "♍",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var libra = {
    	keywords: [
    		"sign",
    		"purple-square",
    		"zodiac",
    		"astrology"
    	],
    	char: "♎",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var scorpius = {
    	keywords: [
    		"sign",
    		"zodiac",
    		"purple-square",
    		"astrology",
    		"scorpio"
    	],
    	char: "♏",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var sagittarius = {
    	keywords: [
    		"sign",
    		"zodiac",
    		"purple-square",
    		"astrology"
    	],
    	char: "♐",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var capricorn = {
    	keywords: [
    		"sign",
    		"zodiac",
    		"purple-square",
    		"astrology"
    	],
    	char: "♑",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var aquarius = {
    	keywords: [
    		"sign",
    		"purple-square",
    		"zodiac",
    		"astrology"
    	],
    	char: "♒",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var pisces = {
    	keywords: [
    		"purple-square",
    		"sign",
    		"zodiac",
    		"astrology"
    	],
    	char: "♓",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var id = {
    	keywords: [
    		"purple-square",
    		"words"
    	],
    	char: "🆔",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var atom_symbol = {
    	keywords: [
    		"science",
    		"physics",
    		"chemistry"
    	],
    	char: "⚛",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u7a7a = {
    	keywords: [
    		"kanji",
    		"japanese",
    		"chinese",
    		"empty",
    		"sky",
    		"blue-square"
    	],
    	char: "🈳",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u5272 = {
    	keywords: [
    		"cut",
    		"divide",
    		"chinese",
    		"kanji",
    		"pink-square"
    	],
    	char: "🈹",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var radioactive = {
    	keywords: [
    		"nuclear",
    		"danger"
    	],
    	char: "☢",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var biohazard = {
    	keywords: [
    		"danger"
    	],
    	char: "☣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var mobile_phone_off = {
    	keywords: [
    		"mute",
    		"orange-square",
    		"silence",
    		"quiet"
    	],
    	char: "📴",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var vibration_mode = {
    	keywords: [
    		"orange-square",
    		"phone"
    	],
    	char: "📳",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u6709 = {
    	keywords: [
    		"orange-square",
    		"chinese",
    		"have",
    		"kanji"
    	],
    	char: "🈶",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u7121 = {
    	keywords: [
    		"nothing",
    		"chinese",
    		"kanji",
    		"japanese",
    		"orange-square"
    	],
    	char: "🈚",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u7533 = {
    	keywords: [
    		"chinese",
    		"japanese",
    		"kanji",
    		"orange-square"
    	],
    	char: "🈸",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u55b6 = {
    	keywords: [
    		"japanese",
    		"opening hours",
    		"orange-square"
    	],
    	char: "🈺",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u6708 = {
    	keywords: [
    		"chinese",
    		"month",
    		"moon",
    		"japanese",
    		"orange-square",
    		"kanji"
    	],
    	char: "🈷️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var eight_pointed_black_star = {
    	keywords: [
    		"orange-square",
    		"shape",
    		"polygon"
    	],
    	char: "✴️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var vs = {
    	keywords: [
    		"words",
    		"orange-square"
    	],
    	char: "🆚",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var accept = {
    	keywords: [
    		"ok",
    		"good",
    		"chinese",
    		"kanji",
    		"agree",
    		"yes",
    		"orange-circle"
    	],
    	char: "🉑",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_flower = {
    	keywords: [
    		"japanese",
    		"spring"
    	],
    	char: "💮",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var ideograph_advantage = {
    	keywords: [
    		"chinese",
    		"kanji",
    		"obtain",
    		"get",
    		"circle"
    	],
    	char: "🉐",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var secret = {
    	keywords: [
    		"privacy",
    		"chinese",
    		"sshh",
    		"kanji",
    		"red-circle"
    	],
    	char: "㊙️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var congratulations = {
    	keywords: [
    		"chinese",
    		"kanji",
    		"japanese",
    		"red-circle"
    	],
    	char: "㊗️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u5408 = {
    	keywords: [
    		"japanese",
    		"chinese",
    		"join",
    		"kanji",
    		"red-square"
    	],
    	char: "🈴",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u6e80 = {
    	keywords: [
    		"full",
    		"chinese",
    		"japanese",
    		"red-square",
    		"kanji"
    	],
    	char: "🈵",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u7981 = {
    	keywords: [
    		"kanji",
    		"japanese",
    		"chinese",
    		"forbidden",
    		"limit",
    		"restricted",
    		"red-square"
    	],
    	char: "🈲",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var a = {
    	keywords: [
    		"red-square",
    		"alphabet",
    		"letter"
    	],
    	char: "🅰️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var b = {
    	keywords: [
    		"red-square",
    		"alphabet",
    		"letter"
    	],
    	char: "🅱️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var ab = {
    	keywords: [
    		"red-square",
    		"alphabet"
    	],
    	char: "🆎",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var cl = {
    	keywords: [
    		"alphabet",
    		"words",
    		"red-square"
    	],
    	char: "🆑",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var o2 = {
    	keywords: [
    		"alphabet",
    		"red-square",
    		"letter"
    	],
    	char: "🅾️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var sos = {
    	keywords: [
    		"help",
    		"red-square",
    		"words",
    		"emergency",
    		"911"
    	],
    	char: "🆘",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_entry = {
    	keywords: [
    		"limit",
    		"security",
    		"privacy",
    		"bad",
    		"denied",
    		"stop",
    		"circle"
    	],
    	char: "⛔",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var name_badge = {
    	keywords: [
    		"fire",
    		"forbid"
    	],
    	char: "📛",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_entry_sign = {
    	keywords: [
    		"forbid",
    		"stop",
    		"limit",
    		"denied",
    		"disallow",
    		"circle"
    	],
    	char: "🚫",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var x = {
    	keywords: [
    		"no",
    		"delete",
    		"remove",
    		"cancel",
    		"red"
    	],
    	char: "❌",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var o = {
    	keywords: [
    		"circle",
    		"round"
    	],
    	char: "⭕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var stop_sign = {
    	keywords: [
    		"stop"
    	],
    	char: "🛑",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var anger = {
    	keywords: [
    		"angry",
    		"mad"
    	],
    	char: "💢",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var hotsprings = {
    	keywords: [
    		"bath",
    		"warm",
    		"relax"
    	],
    	char: "♨️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_pedestrians = {
    	keywords: [
    		"rules",
    		"crossing",
    		"walking",
    		"circle"
    	],
    	char: "🚷",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var do_not_litter = {
    	keywords: [
    		"trash",
    		"bin",
    		"garbage",
    		"circle"
    	],
    	char: "🚯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_bicycles = {
    	keywords: [
    		"cyclist",
    		"prohibited",
    		"circle"
    	],
    	char: "🚳",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var underage = {
    	keywords: [
    		"18",
    		"drink",
    		"pub",
    		"night",
    		"minor",
    		"circle"
    	],
    	char: "🔞",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_mobile_phones = {
    	keywords: [
    		"iphone",
    		"mute",
    		"circle"
    	],
    	char: "📵",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var exclamation = {
    	keywords: [
    		"heavy_exclamation_mark",
    		"danger",
    		"surprise",
    		"punctuation",
    		"wow",
    		"warning"
    	],
    	char: "❗",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var grey_exclamation = {
    	keywords: [
    		"surprise",
    		"punctuation",
    		"gray",
    		"wow",
    		"warning"
    	],
    	char: "❕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var question = {
    	keywords: [
    		"doubt",
    		"confused"
    	],
    	char: "❓",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var grey_question = {
    	keywords: [
    		"doubts",
    		"gray",
    		"huh",
    		"confused"
    	],
    	char: "❔",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var bangbang = {
    	keywords: [
    		"exclamation",
    		"surprise"
    	],
    	char: "‼️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var interrobang = {
    	keywords: [
    		"wat",
    		"punctuation",
    		"surprise"
    	],
    	char: "⁉️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var low_brightness = {
    	keywords: [
    		"sun",
    		"afternoon",
    		"warm",
    		"summer"
    	],
    	char: "🔅",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var high_brightness = {
    	keywords: [
    		"sun",
    		"light"
    	],
    	char: "🔆",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var trident = {
    	keywords: [
    		"weapon",
    		"spear"
    	],
    	char: "🔱",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var fleur_de_lis = {
    	keywords: [
    		"decorative",
    		"scout"
    	],
    	char: "⚜",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var part_alternation_mark = {
    	keywords: [
    		"graph",
    		"presentation",
    		"stats",
    		"business",
    		"economics",
    		"bad"
    	],
    	char: "〽️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var warning = {
    	keywords: [
    		"exclamation",
    		"wip",
    		"alert",
    		"error",
    		"problem",
    		"issue"
    	],
    	char: "⚠️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var children_crossing = {
    	keywords: [
    		"school",
    		"warning",
    		"danger",
    		"sign",
    		"driving",
    		"yellow-diamond"
    	],
    	char: "🚸",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var beginner = {
    	keywords: [
    		"badge",
    		"shield"
    	],
    	char: "🔰",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var recycle = {
    	keywords: [
    		"arrow",
    		"environment",
    		"garbage",
    		"trash"
    	],
    	char: "♻️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var u6307 = {
    	keywords: [
    		"chinese",
    		"point",
    		"green-square",
    		"kanji"
    	],
    	char: "🈯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var chart = {
    	keywords: [
    		"green-square",
    		"graph",
    		"presentation",
    		"stats"
    	],
    	char: "💹",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var sparkle = {
    	keywords: [
    		"stars",
    		"green-square",
    		"awesome",
    		"good",
    		"fireworks"
    	],
    	char: "❇️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var eight_spoked_asterisk = {
    	keywords: [
    		"star",
    		"sparkle",
    		"green-square"
    	],
    	char: "✳️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var negative_squared_cross_mark = {
    	keywords: [
    		"x",
    		"green-square",
    		"no",
    		"deny"
    	],
    	char: "❎",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_check_mark = {
    	keywords: [
    		"green-square",
    		"ok",
    		"agree",
    		"vote",
    		"election",
    		"answer",
    		"tick"
    	],
    	char: "✅",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var diamond_shape_with_a_dot_inside = {
    	keywords: [
    		"jewel",
    		"blue",
    		"gem",
    		"crystal",
    		"fancy"
    	],
    	char: "💠",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var cyclone = {
    	keywords: [
    		"weather",
    		"swirl",
    		"blue",
    		"cloud",
    		"vortex",
    		"spiral",
    		"whirlpool",
    		"spin",
    		"tornado",
    		"hurricane",
    		"typhoon"
    	],
    	char: "🌀",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var loop = {
    	keywords: [
    		"tape",
    		"cassette"
    	],
    	char: "➿",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var globe_with_meridians = {
    	keywords: [
    		"earth",
    		"international",
    		"world",
    		"internet",
    		"interweb",
    		"i18n"
    	],
    	char: "🌐",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var m = {
    	keywords: [
    		"alphabet",
    		"blue-circle",
    		"letter"
    	],
    	char: "Ⓜ️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var atm = {
    	keywords: [
    		"money",
    		"sales",
    		"cash",
    		"blue-square",
    		"payment",
    		"bank"
    	],
    	char: "🏧",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var sa = {
    	keywords: [
    		"japanese",
    		"blue-square",
    		"katakana"
    	],
    	char: "🈂️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var passport_control = {
    	keywords: [
    		"custom",
    		"blue-square"
    	],
    	char: "🛂",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var customs = {
    	keywords: [
    		"passport",
    		"border",
    		"blue-square"
    	],
    	char: "🛃",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var baggage_claim = {
    	keywords: [
    		"blue-square",
    		"airport",
    		"transport"
    	],
    	char: "🛄",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var left_luggage = {
    	keywords: [
    		"blue-square",
    		"travel"
    	],
    	char: "🛅",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var wheelchair = {
    	keywords: [
    		"blue-square",
    		"disabled",
    		"a11y",
    		"accessibility"
    	],
    	char: "♿",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_smoking = {
    	keywords: [
    		"cigarette",
    		"blue-square",
    		"smell",
    		"smoke"
    	],
    	char: "🚭",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var wc = {
    	keywords: [
    		"toilet",
    		"restroom",
    		"blue-square"
    	],
    	char: "🚾",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var parking = {
    	keywords: [
    		"cars",
    		"blue-square",
    		"alphabet",
    		"letter"
    	],
    	char: "🅿️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var potable_water = {
    	keywords: [
    		"blue-square",
    		"liquid",
    		"restroom",
    		"cleaning",
    		"faucet"
    	],
    	char: "🚰",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var mens = {
    	keywords: [
    		"toilet",
    		"restroom",
    		"wc",
    		"blue-square",
    		"gender",
    		"male"
    	],
    	char: "🚹",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var womens = {
    	keywords: [
    		"purple-square",
    		"woman",
    		"female",
    		"toilet",
    		"loo",
    		"restroom",
    		"gender"
    	],
    	char: "🚺",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var baby_symbol = {
    	keywords: [
    		"orange-square",
    		"child"
    	],
    	char: "🚼",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var restroom = {
    	keywords: [
    		"blue-square",
    		"toilet",
    		"refresh",
    		"wc",
    		"gender"
    	],
    	char: "🚻",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var put_litter_in_its_place = {
    	keywords: [
    		"blue-square",
    		"sign",
    		"human",
    		"info"
    	],
    	char: "🚮",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var cinema = {
    	keywords: [
    		"blue-square",
    		"record",
    		"film",
    		"movie",
    		"curtain",
    		"stage",
    		"theater"
    	],
    	char: "🎦",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var signal_strength = {
    	keywords: [
    		"blue-square",
    		"reception",
    		"phone",
    		"internet",
    		"connection",
    		"wifi",
    		"bluetooth",
    		"bars"
    	],
    	char: "📶",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var koko = {
    	keywords: [
    		"blue-square",
    		"here",
    		"katakana",
    		"japanese",
    		"destination"
    	],
    	char: "🈁",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var ng = {
    	keywords: [
    		"blue-square",
    		"words",
    		"shape",
    		"icon"
    	],
    	char: "🆖",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var ok = {
    	keywords: [
    		"good",
    		"agree",
    		"yes",
    		"blue-square"
    	],
    	char: "🆗",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var up = {
    	keywords: [
    		"blue-square",
    		"above",
    		"high"
    	],
    	char: "🆙",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var cool = {
    	keywords: [
    		"words",
    		"blue-square"
    	],
    	char: "🆒",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var free = {
    	keywords: [
    		"blue-square",
    		"words"
    	],
    	char: "🆓",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var zero = {
    	keywords: [
    		"0",
    		"numbers",
    		"blue-square",
    		"null"
    	],
    	char: "0️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var one = {
    	keywords: [
    		"blue-square",
    		"numbers",
    		"1"
    	],
    	char: "1️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var two = {
    	keywords: [
    		"numbers",
    		"2",
    		"prime",
    		"blue-square"
    	],
    	char: "2️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var three = {
    	keywords: [
    		"3",
    		"numbers",
    		"prime",
    		"blue-square"
    	],
    	char: "3️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var four = {
    	keywords: [
    		"4",
    		"numbers",
    		"blue-square"
    	],
    	char: "4️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var five = {
    	keywords: [
    		"5",
    		"numbers",
    		"blue-square",
    		"prime"
    	],
    	char: "5️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var six = {
    	keywords: [
    		"6",
    		"numbers",
    		"blue-square"
    	],
    	char: "6️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var seven = {
    	keywords: [
    		"7",
    		"numbers",
    		"blue-square",
    		"prime"
    	],
    	char: "7️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var eight = {
    	keywords: [
    		"8",
    		"blue-square",
    		"numbers"
    	],
    	char: "8️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var nine = {
    	keywords: [
    		"blue-square",
    		"numbers",
    		"9"
    	],
    	char: "9️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var keycap_ten = {
    	keywords: [
    		"numbers",
    		"10",
    		"blue-square"
    	],
    	char: "🔟",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var asterisk = {
    	keywords: [
    		"star",
    		"keycap"
    	],
    	char: "*⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var eject_button = {
    	keywords: [
    		"blue-square"
    	],
    	char: "⏏️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_forward = {
    	keywords: [
    		"blue-square",
    		"right",
    		"direction",
    		"play"
    	],
    	char: "▶️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var pause_button = {
    	keywords: [
    		"pause",
    		"blue-square"
    	],
    	char: "⏸",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var next_track_button = {
    	keywords: [
    		"forward",
    		"next",
    		"blue-square"
    	],
    	char: "⏭",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var stop_button = {
    	keywords: [
    		"blue-square"
    	],
    	char: "⏹",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var record_button = {
    	keywords: [
    		"blue-square"
    	],
    	char: "⏺",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var play_or_pause_button = {
    	keywords: [
    		"blue-square",
    		"play",
    		"pause"
    	],
    	char: "⏯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var previous_track_button = {
    	keywords: [
    		"backward"
    	],
    	char: "⏮",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var fast_forward = {
    	keywords: [
    		"blue-square",
    		"play",
    		"speed",
    		"continue"
    	],
    	char: "⏩",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var rewind = {
    	keywords: [
    		"play",
    		"blue-square"
    	],
    	char: "⏪",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var twisted_rightwards_arrows = {
    	keywords: [
    		"blue-square",
    		"shuffle",
    		"music",
    		"random"
    	],
    	char: "🔀",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var repeat = {
    	keywords: [
    		"loop",
    		"record"
    	],
    	char: "🔁",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var repeat_one = {
    	keywords: [
    		"blue-square",
    		"loop"
    	],
    	char: "🔂",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_backward = {
    	keywords: [
    		"blue-square",
    		"left",
    		"direction"
    	],
    	char: "◀️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_up_small = {
    	keywords: [
    		"blue-square",
    		"triangle",
    		"direction",
    		"point",
    		"forward",
    		"top"
    	],
    	char: "🔼",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_down_small = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"bottom"
    	],
    	char: "🔽",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_double_up = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"top"
    	],
    	char: "⏫",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_double_down = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"bottom"
    	],
    	char: "⏬",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_right = {
    	keywords: [
    		"blue-square",
    		"next"
    	],
    	char: "➡️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_left = {
    	keywords: [
    		"blue-square",
    		"previous",
    		"back"
    	],
    	char: "⬅️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_up = {
    	keywords: [
    		"blue-square",
    		"continue",
    		"top",
    		"direction"
    	],
    	char: "⬆️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_down = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"bottom"
    	],
    	char: "⬇️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_upper_right = {
    	keywords: [
    		"blue-square",
    		"point",
    		"direction",
    		"diagonal",
    		"northeast"
    	],
    	char: "↗️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_lower_right = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"diagonal",
    		"southeast"
    	],
    	char: "↘️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_lower_left = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"diagonal",
    		"southwest"
    	],
    	char: "↙️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_upper_left = {
    	keywords: [
    		"blue-square",
    		"point",
    		"direction",
    		"diagonal",
    		"northwest"
    	],
    	char: "↖️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_up_down = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"way",
    		"vertical"
    	],
    	char: "↕️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var left_right_arrow = {
    	keywords: [
    		"shape",
    		"direction",
    		"horizontal",
    		"sideways"
    	],
    	char: "↔️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrows_counterclockwise = {
    	keywords: [
    		"blue-square",
    		"sync",
    		"cycle"
    	],
    	char: "🔄",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_right_hook = {
    	keywords: [
    		"blue-square",
    		"return",
    		"rotate",
    		"direction"
    	],
    	char: "↪️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var leftwards_arrow_with_hook = {
    	keywords: [
    		"back",
    		"return",
    		"blue-square",
    		"undo",
    		"enter"
    	],
    	char: "↩️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_heading_up = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"top"
    	],
    	char: "⤴️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrow_heading_down = {
    	keywords: [
    		"blue-square",
    		"direction",
    		"bottom"
    	],
    	char: "⤵️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var hash = {
    	keywords: [
    		"symbol",
    		"blue-square",
    		"twitter"
    	],
    	char: "#️⃣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var information_source = {
    	keywords: [
    		"blue-square",
    		"alphabet",
    		"letter"
    	],
    	char: "ℹ️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var abc = {
    	keywords: [
    		"blue-square",
    		"alphabet"
    	],
    	char: "🔤",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var abcd = {
    	keywords: [
    		"blue-square",
    		"alphabet"
    	],
    	char: "🔡",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var capital_abcd = {
    	keywords: [
    		"alphabet",
    		"words",
    		"blue-square"
    	],
    	char: "🔠",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var symbols = {
    	keywords: [
    		"blue-square",
    		"music",
    		"note",
    		"ampersand",
    		"percent",
    		"glyphs",
    		"characters"
    	],
    	char: "🔣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var musical_note = {
    	keywords: [
    		"score",
    		"tone",
    		"sound"
    	],
    	char: "🎵",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var notes = {
    	keywords: [
    		"music",
    		"score"
    	],
    	char: "🎶",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var wavy_dash = {
    	keywords: [
    		"draw",
    		"line",
    		"moustache",
    		"mustache",
    		"squiggle",
    		"scribble"
    	],
    	char: "〰️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var curly_loop = {
    	keywords: [
    		"scribble",
    		"draw",
    		"shape",
    		"squiggle"
    	],
    	char: "➰",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_check_mark = {
    	keywords: [
    		"ok",
    		"nike",
    		"answer",
    		"yes",
    		"tick"
    	],
    	char: "✔️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var arrows_clockwise = {
    	keywords: [
    		"sync",
    		"cycle",
    		"round",
    		"repeat"
    	],
    	char: "🔃",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_plus_sign = {
    	keywords: [
    		"math",
    		"calculation",
    		"addition",
    		"more",
    		"increase"
    	],
    	char: "➕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_minus_sign = {
    	keywords: [
    		"math",
    		"calculation",
    		"subtract",
    		"less"
    	],
    	char: "➖",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_division_sign = {
    	keywords: [
    		"divide",
    		"math",
    		"calculation"
    	],
    	char: "➗",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_multiplication_x = {
    	keywords: [
    		"math",
    		"calculation"
    	],
    	char: "✖️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var infinity = {
    	keywords: [
    		"forever"
    	],
    	char: "♾",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var heavy_dollar_sign = {
    	keywords: [
    		"money",
    		"sales",
    		"payment",
    		"currency",
    		"buck"
    	],
    	char: "💲",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var currency_exchange = {
    	keywords: [
    		"money",
    		"sales",
    		"dollar",
    		"travel"
    	],
    	char: "💱",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var copyright = {
    	keywords: [
    		"ip",
    		"license",
    		"circle",
    		"law",
    		"legal"
    	],
    	char: "©️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var registered = {
    	keywords: [
    		"alphabet",
    		"circle"
    	],
    	char: "®️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var tm = {
    	keywords: [
    		"trademark",
    		"brand",
    		"law",
    		"legal"
    	],
    	char: "™️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var end = {
    	keywords: [
    		"words",
    		"arrow"
    	],
    	char: "🔚",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var back = {
    	keywords: [
    		"arrow",
    		"words",
    		"return"
    	],
    	char: "🔙",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var on = {
    	keywords: [
    		"arrow",
    		"words"
    	],
    	char: "🔛",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var top = {
    	keywords: [
    		"words",
    		"blue-square"
    	],
    	char: "🔝",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var soon = {
    	keywords: [
    		"arrow",
    		"words"
    	],
    	char: "🔜",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var ballot_box_with_check = {
    	keywords: [
    		"ok",
    		"agree",
    		"confirm",
    		"black-square",
    		"vote",
    		"election",
    		"yes",
    		"tick"
    	],
    	char: "☑️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var radio_button = {
    	keywords: [
    		"input",
    		"old",
    		"music",
    		"circle"
    	],
    	char: "🔘",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_circle = {
    	keywords: [
    		"shape",
    		"round"
    	],
    	char: "⚪",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_circle = {
    	keywords: [
    		"shape",
    		"button",
    		"round"
    	],
    	char: "⚫",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var red_circle = {
    	keywords: [
    		"shape",
    		"error",
    		"danger"
    	],
    	char: "🔴",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var large_blue_circle = {
    	keywords: [
    		"shape",
    		"icon",
    		"button"
    	],
    	char: "🔵",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var small_orange_diamond = {
    	keywords: [
    		"shape",
    		"jewel",
    		"gem"
    	],
    	char: "🔸",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var small_blue_diamond = {
    	keywords: [
    		"shape",
    		"jewel",
    		"gem"
    	],
    	char: "🔹",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var large_orange_diamond = {
    	keywords: [
    		"shape",
    		"jewel",
    		"gem"
    	],
    	char: "🔶",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var large_blue_diamond = {
    	keywords: [
    		"shape",
    		"jewel",
    		"gem"
    	],
    	char: "🔷",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var small_red_triangle = {
    	keywords: [
    		"shape",
    		"direction",
    		"up",
    		"top"
    	],
    	char: "🔺",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_small_square = {
    	keywords: [
    		"shape",
    		"icon"
    	],
    	char: "▪️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_small_square = {
    	keywords: [
    		"shape",
    		"icon"
    	],
    	char: "▫️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_large_square = {
    	keywords: [
    		"shape",
    		"icon",
    		"button"
    	],
    	char: "⬛",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_large_square = {
    	keywords: [
    		"shape",
    		"icon",
    		"stone",
    		"button"
    	],
    	char: "⬜",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var small_red_triangle_down = {
    	keywords: [
    		"shape",
    		"direction",
    		"bottom"
    	],
    	char: "🔻",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_medium_square = {
    	keywords: [
    		"shape",
    		"button",
    		"icon"
    	],
    	char: "◼️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_medium_square = {
    	keywords: [
    		"shape",
    		"stone",
    		"icon"
    	],
    	char: "◻️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_medium_small_square = {
    	keywords: [
    		"icon",
    		"shape",
    		"button"
    	],
    	char: "◾",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_medium_small_square = {
    	keywords: [
    		"shape",
    		"stone",
    		"icon",
    		"button"
    	],
    	char: "◽",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_square_button = {
    	keywords: [
    		"shape",
    		"input",
    		"frame"
    	],
    	char: "🔲",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var white_square_button = {
    	keywords: [
    		"shape",
    		"input"
    	],
    	char: "🔳",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var speaker = {
    	keywords: [
    		"sound",
    		"volume",
    		"silence",
    		"broadcast"
    	],
    	char: "🔈",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var sound = {
    	keywords: [
    		"volume",
    		"speaker",
    		"broadcast"
    	],
    	char: "🔉",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var loud_sound = {
    	keywords: [
    		"volume",
    		"noise",
    		"noisy",
    		"speaker",
    		"broadcast"
    	],
    	char: "🔊",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var mute = {
    	keywords: [
    		"sound",
    		"volume",
    		"silence",
    		"quiet"
    	],
    	char: "🔇",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var mega = {
    	keywords: [
    		"sound",
    		"speaker",
    		"volume"
    	],
    	char: "📣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var loudspeaker = {
    	keywords: [
    		"volume",
    		"sound"
    	],
    	char: "📢",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var bell = {
    	keywords: [
    		"sound",
    		"notification",
    		"christmas",
    		"xmas",
    		"chime"
    	],
    	char: "🔔",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var no_bell = {
    	keywords: [
    		"sound",
    		"volume",
    		"mute",
    		"quiet",
    		"silent"
    	],
    	char: "🔕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var black_joker = {
    	keywords: [
    		"poker",
    		"cards",
    		"game",
    		"play",
    		"magic"
    	],
    	char: "🃏",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var mahjong = {
    	keywords: [
    		"game",
    		"play",
    		"chinese",
    		"kanji"
    	],
    	char: "🀄",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var spades = {
    	keywords: [
    		"poker",
    		"cards",
    		"suits",
    		"magic"
    	],
    	char: "♠️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clubs = {
    	keywords: [
    		"poker",
    		"cards",
    		"magic",
    		"suits"
    	],
    	char: "♣️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var hearts = {
    	keywords: [
    		"poker",
    		"cards",
    		"magic",
    		"suits"
    	],
    	char: "♥️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var diamonds = {
    	keywords: [
    		"poker",
    		"cards",
    		"magic",
    		"suits"
    	],
    	char: "♦️",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var flower_playing_cards = {
    	keywords: [
    		"game",
    		"sunset",
    		"red"
    	],
    	char: "🎴",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var thought_balloon = {
    	keywords: [
    		"bubble",
    		"cloud",
    		"speech",
    		"thinking",
    		"dream"
    	],
    	char: "💭",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var right_anger_bubble = {
    	keywords: [
    		"caption",
    		"speech",
    		"thinking",
    		"mad"
    	],
    	char: "🗯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var speech_balloon = {
    	keywords: [
    		"bubble",
    		"words",
    		"message",
    		"talk",
    		"chatting"
    	],
    	char: "💬",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var left_speech_bubble = {
    	keywords: [
    		"words",
    		"message",
    		"talk",
    		"chatting"
    	],
    	char: "🗨",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock1 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕐",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock2 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕑",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock3 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕒",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock4 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕓",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock5 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕔",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock6 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule",
    		"dawn",
    		"dusk"
    	],
    	char: "🕕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock7 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕖",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock8 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕗",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock9 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕘",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock10 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕙",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock11 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕚",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock12 = {
    	keywords: [
    		"time",
    		"noon",
    		"midnight",
    		"midday",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕛",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock130 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕜",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock230 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕝",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock330 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕞",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock430 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕟",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock530 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕠",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock630 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕡",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock730 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕢",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock830 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕣",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock930 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕤",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock1030 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕥",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock1130 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕦",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var clock1230 = {
    	keywords: [
    		"time",
    		"late",
    		"early",
    		"schedule"
    	],
    	char: "🕧",
    	fitzpatrick_scale: false,
    	category: "symbols"
    };
    var afghanistan = {
    	keywords: [
    		"af",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var aland_islands = {
    	keywords: [
    		"Åland",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇽",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var albania = {
    	keywords: [
    		"al",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var algeria = {
    	keywords: [
    		"dz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇩🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var american_samoa = {
    	keywords: [
    		"american",
    		"ws",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var andorra = {
    	keywords: [
    		"ad",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var angola = {
    	keywords: [
    		"ao",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var anguilla = {
    	keywords: [
    		"ai",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var antarctica = {
    	keywords: [
    		"aq",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇶",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var antigua_barbuda = {
    	keywords: [
    		"antigua",
    		"barbuda",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var argentina = {
    	keywords: [
    		"ar",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var armenia = {
    	keywords: [
    		"am",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var aruba = {
    	keywords: [
    		"aw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var australia = {
    	keywords: [
    		"au",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var austria = {
    	keywords: [
    		"at",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var azerbaijan = {
    	keywords: [
    		"az",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bahamas = {
    	keywords: [
    		"bs",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bahrain = {
    	keywords: [
    		"bh",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bangladesh = {
    	keywords: [
    		"bd",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var barbados = {
    	keywords: [
    		"bb",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇧",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var belarus = {
    	keywords: [
    		"by",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var belgium = {
    	keywords: [
    		"be",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var belize = {
    	keywords: [
    		"bz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var benin = {
    	keywords: [
    		"bj",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇯",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bermuda = {
    	keywords: [
    		"bm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bhutan = {
    	keywords: [
    		"bt",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bolivia = {
    	keywords: [
    		"bo",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var caribbean_netherlands = {
    	keywords: [
    		"bonaire",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇶",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bosnia_herzegovina = {
    	keywords: [
    		"bosnia",
    		"herzegovina",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var botswana = {
    	keywords: [
    		"bw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var brazil = {
    	keywords: [
    		"br",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var british_indian_ocean_territory = {
    	keywords: [
    		"british",
    		"indian",
    		"ocean",
    		"territory",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var british_virgin_islands = {
    	keywords: [
    		"british",
    		"virgin",
    		"islands",
    		"bvi",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var brunei = {
    	keywords: [
    		"bn",
    		"darussalam",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var bulgaria = {
    	keywords: [
    		"bg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var burkina_faso = {
    	keywords: [
    		"burkina",
    		"faso",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var burundi = {
    	keywords: [
    		"bi",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cape_verde = {
    	keywords: [
    		"cabo",
    		"verde",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇻",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cambodia = {
    	keywords: [
    		"kh",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cameroon = {
    	keywords: [
    		"cm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var canada = {
    	keywords: [
    		"ca",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var canary_islands = {
    	keywords: [
    		"canary",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cayman_islands = {
    	keywords: [
    		"cayman",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var central_african_republic = {
    	keywords: [
    		"central",
    		"african",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var chad = {
    	keywords: [
    		"td",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var chile = {
    	keywords: [
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cn = {
    	keywords: [
    		"china",
    		"chinese",
    		"prc",
    		"flag",
    		"country",
    		"nation",
    		"banner"
    	],
    	char: "🇨🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var christmas_island = {
    	keywords: [
    		"christmas",
    		"island",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇽",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cocos_islands = {
    	keywords: [
    		"cocos",
    		"keeling",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var colombia = {
    	keywords: [
    		"co",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var comoros = {
    	keywords: [
    		"km",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var congo_brazzaville = {
    	keywords: [
    		"congo",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var congo_kinshasa = {
    	keywords: [
    		"congo",
    		"democratic",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cook_islands = {
    	keywords: [
    		"cook",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var costa_rica = {
    	keywords: [
    		"costa",
    		"rica",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var croatia = {
    	keywords: [
    		"hr",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇭🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cuba = {
    	keywords: [
    		"cu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var curacao = {
    	keywords: [
    		"curaçao",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cyprus = {
    	keywords: [
    		"cy",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var czech_republic = {
    	keywords: [
    		"cz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var denmark = {
    	keywords: [
    		"dk",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇩🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var djibouti = {
    	keywords: [
    		"dj",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇩🇯",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var dominica = {
    	keywords: [
    		"dm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇩🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var dominican_republic = {
    	keywords: [
    		"dominican",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇩🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var ecuador = {
    	keywords: [
    		"ec",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var egypt = {
    	keywords: [
    		"eg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var el_salvador = {
    	keywords: [
    		"el",
    		"salvador",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇻",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var equatorial_guinea = {
    	keywords: [
    		"equatorial",
    		"gn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇶",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var eritrea = {
    	keywords: [
    		"er",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var estonia = {
    	keywords: [
    		"ee",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var ethiopia = {
    	keywords: [
    		"et",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var eu = {
    	keywords: [
    		"european",
    		"union",
    		"flag",
    		"banner"
    	],
    	char: "🇪🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var falkland_islands = {
    	keywords: [
    		"falkland",
    		"islands",
    		"malvinas",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇫🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var faroe_islands = {
    	keywords: [
    		"faroe",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇫🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var fiji = {
    	keywords: [
    		"fj",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇫🇯",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var finland = {
    	keywords: [
    		"fi",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇫🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var fr = {
    	keywords: [
    		"banner",
    		"flag",
    		"nation",
    		"france",
    		"french",
    		"country"
    	],
    	char: "🇫🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var french_guiana = {
    	keywords: [
    		"french",
    		"guiana",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var french_polynesia = {
    	keywords: [
    		"french",
    		"polynesia",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var french_southern_territories = {
    	keywords: [
    		"french",
    		"southern",
    		"territories",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var gabon = {
    	keywords: [
    		"ga",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var gambia = {
    	keywords: [
    		"gm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var georgia = {
    	keywords: [
    		"ge",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var de = {
    	keywords: [
    		"german",
    		"nation",
    		"flag",
    		"country",
    		"banner"
    	],
    	char: "🇩🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var ghana = {
    	keywords: [
    		"gh",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var gibraltar = {
    	keywords: [
    		"gi",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var greece = {
    	keywords: [
    		"gr",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var greenland = {
    	keywords: [
    		"gl",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var grenada = {
    	keywords: [
    		"gd",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guadeloupe = {
    	keywords: [
    		"gp",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇵",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guam = {
    	keywords: [
    		"gu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guatemala = {
    	keywords: [
    		"gt",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guernsey = {
    	keywords: [
    		"gg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guinea = {
    	keywords: [
    		"gn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guinea_bissau = {
    	keywords: [
    		"gw",
    		"bissau",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var guyana = {
    	keywords: [
    		"gy",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var haiti = {
    	keywords: [
    		"ht",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇭🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var honduras = {
    	keywords: [
    		"hn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇭🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var hong_kong = {
    	keywords: [
    		"hong",
    		"kong",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇭🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var hungary = {
    	keywords: [
    		"hu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇭🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var iceland = {
    	keywords: [
    		"is",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var india = {
    	keywords: [
    		"in",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var indonesia = {
    	keywords: [
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var iran = {
    	keywords: [
    		"iran,",
    		"islamic",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var iraq = {
    	keywords: [
    		"iq",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇶",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var ireland = {
    	keywords: [
    		"ie",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var isle_of_man = {
    	keywords: [
    		"isle",
    		"man",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var israel = {
    	keywords: [
    		"il",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var it = {
    	keywords: [
    		"italy",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇮🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var cote_divoire = {
    	keywords: [
    		"ivory",
    		"coast",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var jamaica = {
    	keywords: [
    		"jm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇯🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var jp = {
    	keywords: [
    		"japanese",
    		"nation",
    		"flag",
    		"country",
    		"banner"
    	],
    	char: "🇯🇵",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var jersey = {
    	keywords: [
    		"je",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇯🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var jordan = {
    	keywords: [
    		"jo",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇯🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kazakhstan = {
    	keywords: [
    		"kz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kenya = {
    	keywords: [
    		"ke",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kiribati = {
    	keywords: [
    		"ki",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kosovo = {
    	keywords: [
    		"xk",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇽🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kuwait = {
    	keywords: [
    		"kw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kyrgyzstan = {
    	keywords: [
    		"kg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var laos = {
    	keywords: [
    		"lao",
    		"democratic",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var latvia = {
    	keywords: [
    		"lv",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇻",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var lebanon = {
    	keywords: [
    		"lb",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇧",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var lesotho = {
    	keywords: [
    		"ls",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var liberia = {
    	keywords: [
    		"lr",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var libya = {
    	keywords: [
    		"ly",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var liechtenstein = {
    	keywords: [
    		"li",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var lithuania = {
    	keywords: [
    		"lt",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var luxembourg = {
    	keywords: [
    		"lu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var macau = {
    	keywords: [
    		"macao",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var macedonia = {
    	keywords: [
    		"macedonia,",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var madagascar = {
    	keywords: [
    		"mg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var malawi = {
    	keywords: [
    		"mw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var malaysia = {
    	keywords: [
    		"my",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var maldives = {
    	keywords: [
    		"mv",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇻",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mali = {
    	keywords: [
    		"ml",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var malta = {
    	keywords: [
    		"mt",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var marshall_islands = {
    	keywords: [
    		"marshall",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var martinique = {
    	keywords: [
    		"mq",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇶",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mauritania = {
    	keywords: [
    		"mr",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mauritius = {
    	keywords: [
    		"mu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mayotte = {
    	keywords: [
    		"yt",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇾🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mexico = {
    	keywords: [
    		"mx",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇽",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var micronesia = {
    	keywords: [
    		"micronesia,",
    		"federated",
    		"states",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇫🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var moldova = {
    	keywords: [
    		"moldova,",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var monaco = {
    	keywords: [
    		"mc",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mongolia = {
    	keywords: [
    		"mn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var montenegro = {
    	keywords: [
    		"me",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var montserrat = {
    	keywords: [
    		"ms",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var morocco = {
    	keywords: [
    		"ma",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var mozambique = {
    	keywords: [
    		"mz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var myanmar = {
    	keywords: [
    		"mm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var namibia = {
    	keywords: [
    		"na",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var nauru = {
    	keywords: [
    		"nr",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var nepal = {
    	keywords: [
    		"np",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇵",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var netherlands = {
    	keywords: [
    		"nl",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var new_caledonia = {
    	keywords: [
    		"new",
    		"caledonia",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var new_zealand = {
    	keywords: [
    		"new",
    		"zealand",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var nicaragua = {
    	keywords: [
    		"ni",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var niger = {
    	keywords: [
    		"ne",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var nigeria = {
    	keywords: [
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var niue = {
    	keywords: [
    		"nu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var norfolk_island = {
    	keywords: [
    		"norfolk",
    		"island",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var northern_mariana_islands = {
    	keywords: [
    		"northern",
    		"mariana",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇲🇵",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var north_korea = {
    	keywords: [
    		"north",
    		"korea",
    		"nation",
    		"flag",
    		"country",
    		"banner"
    	],
    	char: "🇰🇵",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var norway = {
    	keywords: [
    		"no",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇳🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var oman = {
    	keywords: [
    		"om_symbol",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇴🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var pakistan = {
    	keywords: [
    		"pk",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var palau = {
    	keywords: [
    		"pw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var palestinian_territories = {
    	keywords: [
    		"palestine",
    		"palestinian",
    		"territories",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var panama = {
    	keywords: [
    		"pa",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var papua_new_guinea = {
    	keywords: [
    		"papua",
    		"new",
    		"guinea",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var paraguay = {
    	keywords: [
    		"py",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var peru = {
    	keywords: [
    		"pe",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var philippines = {
    	keywords: [
    		"ph",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var pitcairn_islands = {
    	keywords: [
    		"pitcairn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var poland = {
    	keywords: [
    		"pl",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var portugal = {
    	keywords: [
    		"pt",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var puerto_rico = {
    	keywords: [
    		"puerto",
    		"rico",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var qatar = {
    	keywords: [
    		"qa",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇶🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var reunion = {
    	keywords: [
    		"réunion",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇷🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var romania = {
    	keywords: [
    		"ro",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇷🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var ru = {
    	keywords: [
    		"russian",
    		"federation",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇷🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var rwanda = {
    	keywords: [
    		"rw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇷🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var st_barthelemy = {
    	keywords: [
    		"saint",
    		"barthélemy",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇧🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var st_helena = {
    	keywords: [
    		"saint",
    		"helena",
    		"ascension",
    		"tristan",
    		"cunha",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var st_kitts_nevis = {
    	keywords: [
    		"saint",
    		"kitts",
    		"nevis",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇰🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var st_lucia = {
    	keywords: [
    		"saint",
    		"lucia",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var st_pierre_miquelon = {
    	keywords: [
    		"saint",
    		"pierre",
    		"miquelon",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇵🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var st_vincent_grenadines = {
    	keywords: [
    		"saint",
    		"vincent",
    		"grenadines",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var samoa = {
    	keywords: [
    		"ws",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇼🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var san_marino = {
    	keywords: [
    		"san",
    		"marino",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var sao_tome_principe = {
    	keywords: [
    		"sao",
    		"tome",
    		"principe",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var saudi_arabia = {
    	keywords: [
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var senegal = {
    	keywords: [
    		"sn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var serbia = {
    	keywords: [
    		"rs",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇷🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var seychelles = {
    	keywords: [
    		"sc",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var sierra_leone = {
    	keywords: [
    		"sierra",
    		"leone",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var singapore = {
    	keywords: [
    		"sg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var sint_maarten = {
    	keywords: [
    		"sint",
    		"maarten",
    		"dutch",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇽",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var slovakia = {
    	keywords: [
    		"sk",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var slovenia = {
    	keywords: [
    		"si",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var solomon_islands = {
    	keywords: [
    		"solomon",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇧",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var somalia = {
    	keywords: [
    		"so",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var south_africa = {
    	keywords: [
    		"south",
    		"africa",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇿🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var south_georgia_south_sandwich_islands = {
    	keywords: [
    		"south",
    		"georgia",
    		"sandwich",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇬🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var kr = {
    	keywords: [
    		"south",
    		"korea",
    		"nation",
    		"flag",
    		"country",
    		"banner"
    	],
    	char: "🇰🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var south_sudan = {
    	keywords: [
    		"south",
    		"sd",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var es = {
    	keywords: [
    		"spain",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var sri_lanka = {
    	keywords: [
    		"sri",
    		"lanka",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇱🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var sudan = {
    	keywords: [
    		"sd",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇩",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var suriname = {
    	keywords: [
    		"sr",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var swaziland = {
    	keywords: [
    		"sz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var sweden = {
    	keywords: [
    		"se",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var switzerland = {
    	keywords: [
    		"ch",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇨🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var syria = {
    	keywords: [
    		"syrian",
    		"arab",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇸🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var taiwan = {
    	keywords: [
    		"tw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tajikistan = {
    	keywords: [
    		"tj",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇯",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tanzania = {
    	keywords: [
    		"tanzania,",
    		"united",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var thailand = {
    	keywords: [
    		"th",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var timor_leste = {
    	keywords: [
    		"timor",
    		"leste",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇱",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var togo = {
    	keywords: [
    		"tg",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tokelau = {
    	keywords: [
    		"tk",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇰",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tonga = {
    	keywords: [
    		"to",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇴",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var trinidad_tobago = {
    	keywords: [
    		"trinidad",
    		"tobago",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇹",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tunisia = {
    	keywords: [
    		"tn",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tr = {
    	keywords: [
    		"turkey",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇷",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var turkmenistan = {
    	keywords: [
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var turks_caicos_islands = {
    	keywords: [
    		"turks",
    		"caicos",
    		"islands",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇨",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var tuvalu = {
    	keywords: [
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇹🇻",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var uganda = {
    	keywords: [
    		"ug",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇺🇬",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var ukraine = {
    	keywords: [
    		"ua",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇺🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var united_arab_emirates = {
    	keywords: [
    		"united",
    		"arab",
    		"emirates",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇦🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var uk = {
    	keywords: [
    		"united",
    		"kingdom",
    		"great",
    		"britain",
    		"northern",
    		"ireland",
    		"flag",
    		"nation",
    		"country",
    		"banner",
    		"british",
    		"UK",
    		"english",
    		"england",
    		"union jack"
    	],
    	char: "🇬🇧",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var england = {
    	keywords: [
    		"flag",
    		"english"
    	],
    	char: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var scotland = {
    	keywords: [
    		"flag",
    		"scottish"
    	],
    	char: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var wales = {
    	keywords: [
    		"flag",
    		"welsh"
    	],
    	char: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var us = {
    	keywords: [
    		"united",
    		"states",
    		"america",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇺🇸",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var us_virgin_islands = {
    	keywords: [
    		"virgin",
    		"islands",
    		"us",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇮",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var uruguay = {
    	keywords: [
    		"uy",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇺🇾",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var uzbekistan = {
    	keywords: [
    		"uz",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇺🇿",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var vanuatu = {
    	keywords: [
    		"vu",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇺",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var vatican_city = {
    	keywords: [
    		"vatican",
    		"city",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇦",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var venezuela = {
    	keywords: [
    		"ve",
    		"bolivarian",
    		"republic",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var vietnam = {
    	keywords: [
    		"viet",
    		"nam",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇻🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var wallis_futuna = {
    	keywords: [
    		"wallis",
    		"futuna",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇼🇫",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var western_sahara = {
    	keywords: [
    		"western",
    		"sahara",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇪🇭",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var yemen = {
    	keywords: [
    		"ye",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇾🇪",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var zambia = {
    	keywords: [
    		"zm",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇿🇲",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var zimbabwe = {
    	keywords: [
    		"zw",
    		"flag",
    		"nation",
    		"country",
    		"banner"
    	],
    	char: "🇿🇼",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var united_nations = {
    	keywords: [
    		"un",
    		"flag",
    		"banner"
    	],
    	char: "🇺🇳",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var pirate_flag = {
    	keywords: [
    		"skull",
    		"crossbones",
    		"flag",
    		"banner"
    	],
    	char: "🏴‍☠️",
    	fitzpatrick_scale: false,
    	category: "flags"
    };
    var require$$0 = {
    	"100": {
    	keywords: [
    		"score",
    		"perfect",
    		"numbers",
    		"century",
    		"exam",
    		"quiz",
    		"test",
    		"pass",
    		"hundred"
    	],
    	char: "💯",
    	fitzpatrick_scale: false,
    	category: "symbols"
    },
    	"1234": {
    	keywords: [
    		"numbers",
    		"blue-square"
    	],
    	char: "🔢",
    	fitzpatrick_scale: false,
    	category: "symbols"
    },
    	grinning: grinning,
    	grimacing: grimacing,
    	grin: grin,
    	joy: joy,
    	rofl: rofl,
    	partying: partying,
    	smiley: smiley,
    	smile: smile,
    	sweat_smile: sweat_smile,
    	laughing: laughing,
    	innocent: innocent,
    	wink: wink,
    	blush: blush,
    	slightly_smiling_face: slightly_smiling_face,
    	upside_down_face: upside_down_face,
    	relaxed: relaxed,
    	yum: yum,
    	relieved: relieved,
    	heart_eyes: heart_eyes,
    	smiling_face_with_three_hearts: smiling_face_with_three_hearts,
    	kissing_heart: kissing_heart,
    	kissing: kissing,
    	kissing_smiling_eyes: kissing_smiling_eyes,
    	kissing_closed_eyes: kissing_closed_eyes,
    	stuck_out_tongue_winking_eye: stuck_out_tongue_winking_eye,
    	zany: zany,
    	raised_eyebrow: raised_eyebrow,
    	monocle: monocle,
    	stuck_out_tongue_closed_eyes: stuck_out_tongue_closed_eyes,
    	stuck_out_tongue: stuck_out_tongue,
    	money_mouth_face: money_mouth_face,
    	nerd_face: nerd_face,
    	sunglasses: sunglasses,
    	star_struck: star_struck,
    	clown_face: clown_face,
    	cowboy_hat_face: cowboy_hat_face,
    	hugs: hugs,
    	smirk: smirk,
    	no_mouth: no_mouth,
    	neutral_face: neutral_face,
    	expressionless: expressionless,
    	unamused: unamused,
    	roll_eyes: roll_eyes,
    	thinking: thinking,
    	lying_face: lying_face,
    	hand_over_mouth: hand_over_mouth,
    	shushing: shushing,
    	symbols_over_mouth: symbols_over_mouth,
    	exploding_head: exploding_head,
    	flushed: flushed,
    	disappointed: disappointed,
    	worried: worried,
    	angry: angry,
    	rage: rage,
    	pensive: pensive,
    	confused: confused,
    	slightly_frowning_face: slightly_frowning_face,
    	frowning_face: frowning_face,
    	persevere: persevere,
    	confounded: confounded,
    	tired_face: tired_face,
    	weary: weary,
    	pleading: pleading,
    	triumph: triumph,
    	open_mouth: open_mouth,
    	scream: scream,
    	fearful: fearful,
    	cold_sweat: cold_sweat,
    	hushed: hushed,
    	frowning: frowning,
    	anguished: anguished,
    	cry: cry,
    	disappointed_relieved: disappointed_relieved,
    	drooling_face: drooling_face,
    	sleepy: sleepy,
    	sweat: sweat,
    	hot: hot,
    	cold: cold,
    	sob: sob,
    	dizzy_face: dizzy_face,
    	astonished: astonished,
    	zipper_mouth_face: zipper_mouth_face,
    	nauseated_face: nauseated_face,
    	sneezing_face: sneezing_face,
    	vomiting: vomiting,
    	mask: mask,
    	face_with_thermometer: face_with_thermometer,
    	face_with_head_bandage: face_with_head_bandage,
    	woozy: woozy,
    	sleeping: sleeping,
    	zzz: zzz,
    	poop: poop,
    	smiling_imp: smiling_imp,
    	imp: imp,
    	japanese_ogre: japanese_ogre,
    	japanese_goblin: japanese_goblin,
    	skull: skull,
    	ghost: ghost,
    	alien: alien,
    	robot: robot,
    	smiley_cat: smiley_cat,
    	smile_cat: smile_cat,
    	joy_cat: joy_cat,
    	heart_eyes_cat: heart_eyes_cat,
    	smirk_cat: smirk_cat,
    	kissing_cat: kissing_cat,
    	scream_cat: scream_cat,
    	crying_cat_face: crying_cat_face,
    	pouting_cat: pouting_cat,
    	palms_up: palms_up,
    	raised_hands: raised_hands,
    	clap: clap,
    	wave: wave,
    	call_me_hand: call_me_hand,
    	"+1": {
    	keywords: [
    		"thumbsup",
    		"yes",
    		"awesome",
    		"good",
    		"agree",
    		"accept",
    		"cool",
    		"hand",
    		"like"
    	],
    	char: "👍",
    	fitzpatrick_scale: true,
    	category: "people"
    },
    	"-1": {
    	keywords: [
    		"thumbsdown",
    		"no",
    		"dislike",
    		"hand"
    	],
    	char: "👎",
    	fitzpatrick_scale: true,
    	category: "people"
    },
    	facepunch: facepunch,
    	fist: fist,
    	fist_left: fist_left,
    	fist_right: fist_right,
    	v: v,
    	ok_hand: ok_hand,
    	raised_hand: raised_hand,
    	raised_back_of_hand: raised_back_of_hand,
    	open_hands: open_hands,
    	muscle: muscle,
    	pray: pray,
    	foot: foot,
    	leg: leg,
    	handshake: handshake,
    	point_up: point_up,
    	point_up_2: point_up_2,
    	point_down: point_down,
    	point_left: point_left,
    	point_right: point_right,
    	fu: fu,
    	raised_hand_with_fingers_splayed: raised_hand_with_fingers_splayed,
    	love_you: love_you,
    	metal: metal,
    	crossed_fingers: crossed_fingers,
    	vulcan_salute: vulcan_salute,
    	writing_hand: writing_hand,
    	selfie: selfie,
    	nail_care: nail_care,
    	lips: lips,
    	tooth: tooth,
    	tongue: tongue,
    	ear: ear,
    	nose: nose,
    	eye: eye,
    	eyes: eyes,
    	brain: brain,
    	bust_in_silhouette: bust_in_silhouette,
    	busts_in_silhouette: busts_in_silhouette,
    	speaking_head: speaking_head,
    	baby: baby,
    	child: child,
    	boy: boy,
    	girl: girl,
    	adult: adult,
    	man: man,
    	woman: woman,
    	blonde_woman: blonde_woman,
    	blonde_man: blonde_man,
    	bearded_person: bearded_person,
    	older_adult: older_adult,
    	older_man: older_man,
    	older_woman: older_woman,
    	man_with_gua_pi_mao: man_with_gua_pi_mao,
    	woman_with_headscarf: woman_with_headscarf,
    	woman_with_turban: woman_with_turban,
    	man_with_turban: man_with_turban,
    	policewoman: policewoman,
    	policeman: policeman,
    	construction_worker_woman: construction_worker_woman,
    	construction_worker_man: construction_worker_man,
    	guardswoman: guardswoman,
    	guardsman: guardsman,
    	female_detective: female_detective,
    	male_detective: male_detective,
    	woman_health_worker: woman_health_worker,
    	man_health_worker: man_health_worker,
    	woman_farmer: woman_farmer,
    	man_farmer: man_farmer,
    	woman_cook: woman_cook,
    	man_cook: man_cook,
    	woman_student: woman_student,
    	man_student: man_student,
    	woman_singer: woman_singer,
    	man_singer: man_singer,
    	woman_teacher: woman_teacher,
    	man_teacher: man_teacher,
    	woman_factory_worker: woman_factory_worker,
    	man_factory_worker: man_factory_worker,
    	woman_technologist: woman_technologist,
    	man_technologist: man_technologist,
    	woman_office_worker: woman_office_worker,
    	man_office_worker: man_office_worker,
    	woman_mechanic: woman_mechanic,
    	man_mechanic: man_mechanic,
    	woman_scientist: woman_scientist,
    	man_scientist: man_scientist,
    	woman_artist: woman_artist,
    	man_artist: man_artist,
    	woman_firefighter: woman_firefighter,
    	man_firefighter: man_firefighter,
    	woman_pilot: woman_pilot,
    	man_pilot: man_pilot,
    	woman_astronaut: woman_astronaut,
    	man_astronaut: man_astronaut,
    	woman_judge: woman_judge,
    	man_judge: man_judge,
    	woman_superhero: woman_superhero,
    	man_superhero: man_superhero,
    	woman_supervillain: woman_supervillain,
    	man_supervillain: man_supervillain,
    	mrs_claus: mrs_claus,
    	santa: santa,
    	sorceress: sorceress,
    	wizard: wizard,
    	woman_elf: woman_elf,
    	man_elf: man_elf,
    	woman_vampire: woman_vampire,
    	man_vampire: man_vampire,
    	woman_zombie: woman_zombie,
    	man_zombie: man_zombie,
    	woman_genie: woman_genie,
    	man_genie: man_genie,
    	mermaid: mermaid,
    	merman: merman,
    	woman_fairy: woman_fairy,
    	man_fairy: man_fairy,
    	angel: angel,
    	pregnant_woman: pregnant_woman,
    	breastfeeding: breastfeeding,
    	princess: princess,
    	prince: prince,
    	bride_with_veil: bride_with_veil,
    	man_in_tuxedo: man_in_tuxedo,
    	running_woman: running_woman,
    	running_man: running_man,
    	walking_woman: walking_woman,
    	walking_man: walking_man,
    	dancer: dancer,
    	man_dancing: man_dancing,
    	dancing_women: dancing_women,
    	dancing_men: dancing_men,
    	couple: couple,
    	two_men_holding_hands: two_men_holding_hands,
    	two_women_holding_hands: two_women_holding_hands,
    	bowing_woman: bowing_woman,
    	bowing_man: bowing_man,
    	man_facepalming: man_facepalming,
    	woman_facepalming: woman_facepalming,
    	woman_shrugging: woman_shrugging,
    	man_shrugging: man_shrugging,
    	tipping_hand_woman: tipping_hand_woman,
    	tipping_hand_man: tipping_hand_man,
    	no_good_woman: no_good_woman,
    	no_good_man: no_good_man,
    	ok_woman: ok_woman,
    	ok_man: ok_man,
    	raising_hand_woman: raising_hand_woman,
    	raising_hand_man: raising_hand_man,
    	pouting_woman: pouting_woman,
    	pouting_man: pouting_man,
    	frowning_woman: frowning_woman,
    	frowning_man: frowning_man,
    	haircut_woman: haircut_woman,
    	haircut_man: haircut_man,
    	massage_woman: massage_woman,
    	massage_man: massage_man,
    	woman_in_steamy_room: woman_in_steamy_room,
    	man_in_steamy_room: man_in_steamy_room,
    	couple_with_heart_woman_man: couple_with_heart_woman_man,
    	couple_with_heart_woman_woman: couple_with_heart_woman_woman,
    	couple_with_heart_man_man: couple_with_heart_man_man,
    	couplekiss_man_woman: couplekiss_man_woman,
    	couplekiss_woman_woman: couplekiss_woman_woman,
    	couplekiss_man_man: couplekiss_man_man,
    	family_man_woman_boy: family_man_woman_boy,
    	family_man_woman_girl: family_man_woman_girl,
    	family_man_woman_girl_boy: family_man_woman_girl_boy,
    	family_man_woman_boy_boy: family_man_woman_boy_boy,
    	family_man_woman_girl_girl: family_man_woman_girl_girl,
    	family_woman_woman_boy: family_woman_woman_boy,
    	family_woman_woman_girl: family_woman_woman_girl,
    	family_woman_woman_girl_boy: family_woman_woman_girl_boy,
    	family_woman_woman_boy_boy: family_woman_woman_boy_boy,
    	family_woman_woman_girl_girl: family_woman_woman_girl_girl,
    	family_man_man_boy: family_man_man_boy,
    	family_man_man_girl: family_man_man_girl,
    	family_man_man_girl_boy: family_man_man_girl_boy,
    	family_man_man_boy_boy: family_man_man_boy_boy,
    	family_man_man_girl_girl: family_man_man_girl_girl,
    	family_woman_boy: family_woman_boy,
    	family_woman_girl: family_woman_girl,
    	family_woman_girl_boy: family_woman_girl_boy,
    	family_woman_boy_boy: family_woman_boy_boy,
    	family_woman_girl_girl: family_woman_girl_girl,
    	family_man_boy: family_man_boy,
    	family_man_girl: family_man_girl,
    	family_man_girl_boy: family_man_girl_boy,
    	family_man_boy_boy: family_man_boy_boy,
    	family_man_girl_girl: family_man_girl_girl,
    	yarn: yarn,
    	thread: thread,
    	coat: coat,
    	labcoat: labcoat,
    	womans_clothes: womans_clothes,
    	tshirt: tshirt,
    	jeans: jeans,
    	necktie: necktie,
    	dress: dress,
    	bikini: bikini,
    	kimono: kimono,
    	lipstick: lipstick,
    	kiss: kiss,
    	footprints: footprints,
    	flat_shoe: flat_shoe,
    	high_heel: high_heel,
    	sandal: sandal,
    	boot: boot,
    	mans_shoe: mans_shoe,
    	athletic_shoe: athletic_shoe,
    	hiking_boot: hiking_boot,
    	socks: socks,
    	gloves: gloves,
    	scarf: scarf,
    	womans_hat: womans_hat,
    	tophat: tophat,
    	billed_hat: billed_hat,
    	rescue_worker_helmet: rescue_worker_helmet,
    	mortar_board: mortar_board,
    	crown: crown,
    	school_satchel: school_satchel,
    	luggage: luggage,
    	pouch: pouch,
    	purse: purse,
    	handbag: handbag,
    	briefcase: briefcase,
    	eyeglasses: eyeglasses,
    	dark_sunglasses: dark_sunglasses,
    	goggles: goggles,
    	ring: ring,
    	closed_umbrella: closed_umbrella,
    	dog: dog,
    	cat: cat,
    	mouse: mouse,
    	hamster: hamster,
    	rabbit: rabbit,
    	fox_face: fox_face,
    	bear: bear,
    	panda_face: panda_face,
    	koala: koala,
    	tiger: tiger,
    	lion: lion,
    	cow: cow,
    	pig: pig,
    	pig_nose: pig_nose,
    	frog: frog,
    	squid: squid,
    	octopus: octopus,
    	shrimp: shrimp,
    	monkey_face: monkey_face,
    	gorilla: gorilla,
    	see_no_evil: see_no_evil,
    	hear_no_evil: hear_no_evil,
    	speak_no_evil: speak_no_evil,
    	monkey: monkey,
    	chicken: chicken,
    	penguin: penguin,
    	bird: bird,
    	baby_chick: baby_chick,
    	hatching_chick: hatching_chick,
    	hatched_chick: hatched_chick,
    	duck: duck,
    	eagle: eagle,
    	owl: owl,
    	bat: bat,
    	wolf: wolf,
    	boar: boar,
    	horse: horse,
    	unicorn: unicorn,
    	honeybee: honeybee,
    	bug: bug,
    	butterfly: butterfly,
    	snail: snail,
    	beetle: beetle,
    	ant: ant,
    	grasshopper: grasshopper,
    	spider: spider,
    	scorpion: scorpion,
    	crab: crab,
    	snake: snake,
    	lizard: lizard,
    	"t-rex": {
    	keywords: [
    		"animal",
    		"nature",
    		"dinosaur",
    		"tyrannosaurus",
    		"extinct"
    	],
    	char: "🦖",
    	fitzpatrick_scale: false,
    	category: "animals_and_nature"
    },
    	sauropod: sauropod,
    	turtle: turtle,
    	tropical_fish: tropical_fish,
    	fish: fish,
    	blowfish: blowfish,
    	dolphin: dolphin,
    	shark: shark,
    	whale: whale,
    	whale2: whale2,
    	crocodile: crocodile,
    	leopard: leopard,
    	zebra: zebra,
    	tiger2: tiger2,
    	water_buffalo: water_buffalo,
    	ox: ox,
    	cow2: cow2,
    	deer: deer,
    	dromedary_camel: dromedary_camel,
    	camel: camel,
    	giraffe: giraffe,
    	elephant: elephant,
    	rhinoceros: rhinoceros,
    	goat: goat,
    	ram: ram,
    	sheep: sheep,
    	racehorse: racehorse,
    	pig2: pig2,
    	rat: rat,
    	mouse2: mouse2,
    	rooster: rooster,
    	turkey: turkey,
    	dove: dove,
    	dog2: dog2,
    	poodle: poodle,
    	cat2: cat2,
    	rabbit2: rabbit2,
    	chipmunk: chipmunk,
    	hedgehog: hedgehog,
    	raccoon: raccoon,
    	llama: llama,
    	hippopotamus: hippopotamus,
    	kangaroo: kangaroo,
    	badger: badger,
    	swan: swan,
    	peacock: peacock,
    	parrot: parrot,
    	lobster: lobster,
    	mosquito: mosquito,
    	paw_prints: paw_prints,
    	dragon: dragon,
    	dragon_face: dragon_face,
    	cactus: cactus,
    	christmas_tree: christmas_tree,
    	evergreen_tree: evergreen_tree,
    	deciduous_tree: deciduous_tree,
    	palm_tree: palm_tree,
    	seedling: seedling,
    	herb: herb,
    	shamrock: shamrock,
    	four_leaf_clover: four_leaf_clover,
    	bamboo: bamboo,
    	tanabata_tree: tanabata_tree,
    	leaves: leaves,
    	fallen_leaf: fallen_leaf,
    	maple_leaf: maple_leaf,
    	ear_of_rice: ear_of_rice,
    	hibiscus: hibiscus,
    	sunflower: sunflower,
    	rose: rose,
    	wilted_flower: wilted_flower,
    	tulip: tulip,
    	blossom: blossom,
    	cherry_blossom: cherry_blossom,
    	bouquet: bouquet,
    	mushroom: mushroom,
    	chestnut: chestnut,
    	jack_o_lantern: jack_o_lantern,
    	shell: shell,
    	spider_web: spider_web,
    	earth_americas: earth_americas,
    	earth_africa: earth_africa,
    	earth_asia: earth_asia,
    	full_moon: full_moon,
    	waning_gibbous_moon: waning_gibbous_moon,
    	last_quarter_moon: last_quarter_moon,
    	waning_crescent_moon: waning_crescent_moon,
    	new_moon: new_moon,
    	waxing_crescent_moon: waxing_crescent_moon,
    	first_quarter_moon: first_quarter_moon,
    	waxing_gibbous_moon: waxing_gibbous_moon,
    	new_moon_with_face: new_moon_with_face,
    	full_moon_with_face: full_moon_with_face,
    	first_quarter_moon_with_face: first_quarter_moon_with_face,
    	last_quarter_moon_with_face: last_quarter_moon_with_face,
    	sun_with_face: sun_with_face,
    	crescent_moon: crescent_moon,
    	star: star,
    	star2: star2,
    	dizzy: dizzy,
    	sparkles: sparkles,
    	comet: comet,
    	sunny: sunny,
    	sun_behind_small_cloud: sun_behind_small_cloud,
    	partly_sunny: partly_sunny,
    	sun_behind_large_cloud: sun_behind_large_cloud,
    	sun_behind_rain_cloud: sun_behind_rain_cloud,
    	cloud: cloud,
    	cloud_with_rain: cloud_with_rain,
    	cloud_with_lightning_and_rain: cloud_with_lightning_and_rain,
    	cloud_with_lightning: cloud_with_lightning,
    	zap: zap,
    	fire: fire,
    	boom: boom,
    	snowflake: snowflake,
    	cloud_with_snow: cloud_with_snow,
    	snowman: snowman,
    	snowman_with_snow: snowman_with_snow,
    	wind_face: wind_face,
    	dash: dash,
    	tornado: tornado,
    	fog: fog,
    	open_umbrella: open_umbrella,
    	umbrella: umbrella,
    	droplet: droplet,
    	sweat_drops: sweat_drops,
    	ocean: ocean,
    	green_apple: green_apple,
    	apple: apple,
    	pear: pear,
    	tangerine: tangerine,
    	lemon: lemon,
    	banana: banana,
    	watermelon: watermelon,
    	grapes: grapes,
    	strawberry: strawberry,
    	melon: melon,
    	cherries: cherries,
    	peach: peach,
    	pineapple: pineapple,
    	coconut: coconut,
    	kiwi_fruit: kiwi_fruit,
    	mango: mango,
    	avocado: avocado,
    	broccoli: broccoli,
    	tomato: tomato,
    	eggplant: eggplant,
    	cucumber: cucumber,
    	carrot: carrot,
    	hot_pepper: hot_pepper,
    	potato: potato,
    	corn: corn,
    	leafy_greens: leafy_greens,
    	sweet_potato: sweet_potato,
    	peanuts: peanuts,
    	honey_pot: honey_pot,
    	croissant: croissant,
    	bread: bread,
    	baguette_bread: baguette_bread,
    	bagel: bagel,
    	pretzel: pretzel,
    	cheese: cheese,
    	egg: egg,
    	bacon: bacon,
    	steak: steak,
    	pancakes: pancakes,
    	poultry_leg: poultry_leg,
    	meat_on_bone: meat_on_bone,
    	bone: bone,
    	fried_shrimp: fried_shrimp,
    	fried_egg: fried_egg,
    	hamburger: hamburger,
    	fries: fries,
    	stuffed_flatbread: stuffed_flatbread,
    	hotdog: hotdog,
    	pizza: pizza,
    	sandwich: sandwich,
    	canned_food: canned_food,
    	spaghetti: spaghetti,
    	taco: taco,
    	burrito: burrito,
    	green_salad: green_salad,
    	shallow_pan_of_food: shallow_pan_of_food,
    	ramen: ramen,
    	stew: stew,
    	fish_cake: fish_cake,
    	fortune_cookie: fortune_cookie,
    	sushi: sushi,
    	bento: bento,
    	curry: curry,
    	rice_ball: rice_ball,
    	rice: rice,
    	rice_cracker: rice_cracker,
    	oden: oden,
    	dango: dango,
    	shaved_ice: shaved_ice,
    	ice_cream: ice_cream,
    	icecream: icecream,
    	pie: pie,
    	cake: cake,
    	cupcake: cupcake,
    	moon_cake: moon_cake,
    	birthday: birthday,
    	custard: custard,
    	candy: candy,
    	lollipop: lollipop,
    	chocolate_bar: chocolate_bar,
    	popcorn: popcorn,
    	dumpling: dumpling,
    	doughnut: doughnut,
    	cookie: cookie,
    	milk_glass: milk_glass,
    	beer: beer,
    	beers: beers,
    	clinking_glasses: clinking_glasses,
    	wine_glass: wine_glass,
    	tumbler_glass: tumbler_glass,
    	cocktail: cocktail,
    	tropical_drink: tropical_drink,
    	champagne: champagne,
    	sake: sake,
    	tea: tea,
    	cup_with_straw: cup_with_straw,
    	coffee: coffee,
    	baby_bottle: baby_bottle,
    	salt: salt,
    	spoon: spoon,
    	fork_and_knife: fork_and_knife,
    	plate_with_cutlery: plate_with_cutlery,
    	bowl_with_spoon: bowl_with_spoon,
    	takeout_box: takeout_box,
    	chopsticks: chopsticks,
    	soccer: soccer,
    	basketball: basketball,
    	football: football,
    	baseball: baseball,
    	softball: softball,
    	tennis: tennis,
    	volleyball: volleyball,
    	rugby_football: rugby_football,
    	flying_disc: flying_disc,
    	"8ball": {
    	keywords: [
    		"pool",
    		"hobby",
    		"game",
    		"luck",
    		"magic"
    	],
    	char: "🎱",
    	fitzpatrick_scale: false,
    	category: "activity"
    },
    	golf: golf,
    	golfing_woman: golfing_woman,
    	golfing_man: golfing_man,
    	ping_pong: ping_pong,
    	badminton: badminton,
    	goal_net: goal_net,
    	ice_hockey: ice_hockey,
    	field_hockey: field_hockey,
    	lacrosse: lacrosse,
    	cricket: cricket,
    	ski: ski,
    	skier: skier,
    	snowboarder: snowboarder,
    	person_fencing: person_fencing,
    	women_wrestling: women_wrestling,
    	men_wrestling: men_wrestling,
    	woman_cartwheeling: woman_cartwheeling,
    	man_cartwheeling: man_cartwheeling,
    	woman_playing_handball: woman_playing_handball,
    	man_playing_handball: man_playing_handball,
    	ice_skate: ice_skate,
    	curling_stone: curling_stone,
    	skateboard: skateboard,
    	sled: sled,
    	bow_and_arrow: bow_and_arrow,
    	fishing_pole_and_fish: fishing_pole_and_fish,
    	boxing_glove: boxing_glove,
    	martial_arts_uniform: martial_arts_uniform,
    	rowing_woman: rowing_woman,
    	rowing_man: rowing_man,
    	climbing_woman: climbing_woman,
    	climbing_man: climbing_man,
    	swimming_woman: swimming_woman,
    	swimming_man: swimming_man,
    	woman_playing_water_polo: woman_playing_water_polo,
    	man_playing_water_polo: man_playing_water_polo,
    	woman_in_lotus_position: woman_in_lotus_position,
    	man_in_lotus_position: man_in_lotus_position,
    	surfing_woman: surfing_woman,
    	surfing_man: surfing_man,
    	bath: bath,
    	basketball_woman: basketball_woman,
    	basketball_man: basketball_man,
    	weight_lifting_woman: weight_lifting_woman,
    	weight_lifting_man: weight_lifting_man,
    	biking_woman: biking_woman,
    	biking_man: biking_man,
    	mountain_biking_woman: mountain_biking_woman,
    	mountain_biking_man: mountain_biking_man,
    	horse_racing: horse_racing,
    	business_suit_levitating: business_suit_levitating,
    	trophy: trophy,
    	running_shirt_with_sash: running_shirt_with_sash,
    	medal_sports: medal_sports,
    	medal_military: medal_military,
    	"1st_place_medal": {
    	keywords: [
    		"award",
    		"winning",
    		"first"
    	],
    	char: "🥇",
    	fitzpatrick_scale: false,
    	category: "activity"
    },
    	"2nd_place_medal": {
    	keywords: [
    		"award",
    		"second"
    	],
    	char: "🥈",
    	fitzpatrick_scale: false,
    	category: "activity"
    },
    	"3rd_place_medal": {
    	keywords: [
    		"award",
    		"third"
    	],
    	char: "🥉",
    	fitzpatrick_scale: false,
    	category: "activity"
    },
    	reminder_ribbon: reminder_ribbon,
    	rosette: rosette,
    	ticket: ticket,
    	tickets: tickets,
    	performing_arts: performing_arts,
    	art: art,
    	circus_tent: circus_tent,
    	woman_juggling: woman_juggling,
    	man_juggling: man_juggling,
    	microphone: microphone,
    	headphones: headphones,
    	musical_score: musical_score,
    	musical_keyboard: musical_keyboard,
    	drum: drum,
    	saxophone: saxophone,
    	trumpet: trumpet,
    	guitar: guitar,
    	violin: violin,
    	clapper: clapper,
    	video_game: video_game,
    	space_invader: space_invader,
    	dart: dart,
    	game_die: game_die,
    	chess_pawn: chess_pawn,
    	slot_machine: slot_machine,
    	jigsaw: jigsaw,
    	bowling: bowling,
    	red_car: red_car,
    	taxi: taxi,
    	blue_car: blue_car,
    	bus: bus,
    	trolleybus: trolleybus,
    	racing_car: racing_car,
    	police_car: police_car,
    	ambulance: ambulance,
    	fire_engine: fire_engine,
    	minibus: minibus,
    	truck: truck,
    	articulated_lorry: articulated_lorry,
    	tractor: tractor,
    	kick_scooter: kick_scooter,
    	motorcycle: motorcycle,
    	bike: bike,
    	motor_scooter: motor_scooter,
    	rotating_light: rotating_light,
    	oncoming_police_car: oncoming_police_car,
    	oncoming_bus: oncoming_bus,
    	oncoming_automobile: oncoming_automobile,
    	oncoming_taxi: oncoming_taxi,
    	aerial_tramway: aerial_tramway,
    	mountain_cableway: mountain_cableway,
    	suspension_railway: suspension_railway,
    	railway_car: railway_car,
    	train: train,
    	monorail: monorail,
    	bullettrain_side: bullettrain_side,
    	bullettrain_front: bullettrain_front,
    	light_rail: light_rail,
    	mountain_railway: mountain_railway,
    	steam_locomotive: steam_locomotive,
    	train2: train2,
    	metro: metro,
    	tram: tram,
    	station: station,
    	flying_saucer: flying_saucer,
    	helicopter: helicopter,
    	small_airplane: small_airplane,
    	airplane: airplane,
    	flight_departure: flight_departure,
    	flight_arrival: flight_arrival,
    	sailboat: sailboat,
    	motor_boat: motor_boat,
    	speedboat: speedboat,
    	ferry: ferry,
    	passenger_ship: passenger_ship,
    	rocket: rocket,
    	artificial_satellite: artificial_satellite,
    	seat: seat,
    	canoe: canoe,
    	anchor: anchor,
    	construction: construction,
    	fuelpump: fuelpump,
    	busstop: busstop,
    	vertical_traffic_light: vertical_traffic_light,
    	traffic_light: traffic_light,
    	checkered_flag: checkered_flag,
    	ship: ship,
    	ferris_wheel: ferris_wheel,
    	roller_coaster: roller_coaster,
    	carousel_horse: carousel_horse,
    	building_construction: building_construction,
    	foggy: foggy,
    	tokyo_tower: tokyo_tower,
    	factory: factory,
    	fountain: fountain,
    	rice_scene: rice_scene,
    	mountain: mountain,
    	mountain_snow: mountain_snow,
    	mount_fuji: mount_fuji,
    	volcano: volcano,
    	japan: japan,
    	camping: camping,
    	tent: tent,
    	national_park: national_park,
    	motorway: motorway,
    	railway_track: railway_track,
    	sunrise: sunrise,
    	sunrise_over_mountains: sunrise_over_mountains,
    	desert: desert,
    	beach_umbrella: beach_umbrella,
    	desert_island: desert_island,
    	city_sunrise: city_sunrise,
    	city_sunset: city_sunset,
    	cityscape: cityscape,
    	night_with_stars: night_with_stars,
    	bridge_at_night: bridge_at_night,
    	milky_way: milky_way,
    	stars: stars,
    	sparkler: sparkler,
    	fireworks: fireworks,
    	rainbow: rainbow,
    	houses: houses,
    	european_castle: european_castle,
    	japanese_castle: japanese_castle,
    	stadium: stadium,
    	statue_of_liberty: statue_of_liberty,
    	house: house,
    	house_with_garden: house_with_garden,
    	derelict_house: derelict_house,
    	office: office,
    	department_store: department_store,
    	post_office: post_office,
    	european_post_office: european_post_office,
    	hospital: hospital,
    	bank: bank,
    	hotel: hotel,
    	convenience_store: convenience_store,
    	school: school,
    	love_hotel: love_hotel,
    	wedding: wedding,
    	classical_building: classical_building,
    	church: church,
    	mosque: mosque,
    	synagogue: synagogue,
    	kaaba: kaaba,
    	shinto_shrine: shinto_shrine,
    	watch: watch,
    	iphone: iphone,
    	calling: calling,
    	computer: computer,
    	keyboard: keyboard,
    	desktop_computer: desktop_computer,
    	printer: printer,
    	computer_mouse: computer_mouse,
    	trackball: trackball,
    	joystick: joystick,
    	clamp: clamp,
    	minidisc: minidisc,
    	floppy_disk: floppy_disk,
    	cd: cd,
    	dvd: dvd,
    	vhs: vhs,
    	camera: camera,
    	camera_flash: camera_flash,
    	video_camera: video_camera,
    	movie_camera: movie_camera,
    	film_projector: film_projector,
    	film_strip: film_strip,
    	telephone_receiver: telephone_receiver,
    	phone: phone,
    	pager: pager,
    	fax: fax,
    	tv: tv,
    	radio: radio,
    	studio_microphone: studio_microphone,
    	level_slider: level_slider,
    	control_knobs: control_knobs,
    	compass: compass,
    	stopwatch: stopwatch,
    	timer_clock: timer_clock,
    	alarm_clock: alarm_clock,
    	mantelpiece_clock: mantelpiece_clock,
    	hourglass_flowing_sand: hourglass_flowing_sand,
    	hourglass: hourglass,
    	satellite: satellite,
    	battery: battery,
    	electric_plug: electric_plug,
    	bulb: bulb,
    	flashlight: flashlight,
    	candle: candle,
    	fire_extinguisher: fire_extinguisher,
    	wastebasket: wastebasket,
    	oil_drum: oil_drum,
    	money_with_wings: money_with_wings,
    	dollar: dollar,
    	yen: yen,
    	euro: euro,
    	pound: pound,
    	moneybag: moneybag,
    	credit_card: credit_card,
    	gem: gem,
    	balance_scale: balance_scale,
    	toolbox: toolbox,
    	wrench: wrench,
    	hammer: hammer,
    	hammer_and_pick: hammer_and_pick,
    	hammer_and_wrench: hammer_and_wrench,
    	pick: pick,
    	nut_and_bolt: nut_and_bolt,
    	gear: gear,
    	brick: brick,
    	chains: chains,
    	magnet: magnet,
    	gun: gun,
    	bomb: bomb,
    	firecracker: firecracker,
    	hocho: hocho,
    	dagger: dagger,
    	crossed_swords: crossed_swords,
    	shield: shield,
    	smoking: smoking,
    	skull_and_crossbones: skull_and_crossbones,
    	coffin: coffin,
    	funeral_urn: funeral_urn,
    	amphora: amphora,
    	crystal_ball: crystal_ball,
    	prayer_beads: prayer_beads,
    	nazar_amulet: nazar_amulet,
    	barber: barber,
    	alembic: alembic,
    	telescope: telescope,
    	microscope: microscope,
    	hole: hole,
    	pill: pill,
    	syringe: syringe,
    	dna: dna,
    	microbe: microbe,
    	petri_dish: petri_dish,
    	test_tube: test_tube,
    	thermometer: thermometer,
    	broom: broom,
    	basket: basket,
    	toilet_paper: toilet_paper,
    	label: label,
    	bookmark: bookmark,
    	toilet: toilet,
    	shower: shower,
    	bathtub: bathtub,
    	soap: soap,
    	sponge: sponge,
    	lotion_bottle: lotion_bottle,
    	key: key,
    	old_key: old_key,
    	couch_and_lamp: couch_and_lamp,
    	sleeping_bed: sleeping_bed,
    	bed: bed,
    	door: door,
    	bellhop_bell: bellhop_bell,
    	teddy_bear: teddy_bear,
    	framed_picture: framed_picture,
    	world_map: world_map,
    	parasol_on_ground: parasol_on_ground,
    	moyai: moyai,
    	shopping: shopping,
    	shopping_cart: shopping_cart,
    	balloon: balloon,
    	flags: flags,
    	ribbon: ribbon,
    	gift: gift,
    	confetti_ball: confetti_ball,
    	tada: tada,
    	dolls: dolls,
    	wind_chime: wind_chime,
    	crossed_flags: crossed_flags,
    	izakaya_lantern: izakaya_lantern,
    	red_envelope: red_envelope,
    	email: email,
    	envelope_with_arrow: envelope_with_arrow,
    	incoming_envelope: incoming_envelope,
    	"e-mail": {
    	keywords: [
    		"communication",
    		"inbox"
    	],
    	char: "📧",
    	fitzpatrick_scale: false,
    	category: "objects"
    },
    	love_letter: love_letter,
    	postbox: postbox,
    	mailbox_closed: mailbox_closed,
    	mailbox: mailbox,
    	mailbox_with_mail: mailbox_with_mail,
    	mailbox_with_no_mail: mailbox_with_no_mail,
    	"package": {
    	keywords: [
    		"mail",
    		"gift",
    		"cardboard",
    		"box",
    		"moving"
    	],
    	char: "📦",
    	fitzpatrick_scale: false,
    	category: "objects"
    },
    	postal_horn: postal_horn,
    	inbox_tray: inbox_tray,
    	outbox_tray: outbox_tray,
    	scroll: scroll,
    	page_with_curl: page_with_curl,
    	bookmark_tabs: bookmark_tabs,
    	receipt: receipt,
    	bar_chart: bar_chart,
    	chart_with_upwards_trend: chart_with_upwards_trend,
    	chart_with_downwards_trend: chart_with_downwards_trend,
    	page_facing_up: page_facing_up,
    	date: date,
    	calendar: calendar,
    	spiral_calendar: spiral_calendar,
    	card_index: card_index,
    	card_file_box: card_file_box,
    	ballot_box: ballot_box,
    	file_cabinet: file_cabinet,
    	clipboard: clipboard,
    	spiral_notepad: spiral_notepad,
    	file_folder: file_folder,
    	open_file_folder: open_file_folder,
    	card_index_dividers: card_index_dividers,
    	newspaper_roll: newspaper_roll,
    	newspaper: newspaper,
    	notebook: notebook,
    	closed_book: closed_book,
    	green_book: green_book,
    	blue_book: blue_book,
    	orange_book: orange_book,
    	notebook_with_decorative_cover: notebook_with_decorative_cover,
    	ledger: ledger,
    	books: books,
    	open_book: open_book,
    	safety_pin: safety_pin,
    	link: link,
    	paperclip: paperclip,
    	paperclips: paperclips,
    	scissors: scissors,
    	triangular_ruler: triangular_ruler,
    	straight_ruler: straight_ruler,
    	abacus: abacus,
    	pushpin: pushpin,
    	round_pushpin: round_pushpin,
    	triangular_flag_on_post: triangular_flag_on_post,
    	white_flag: white_flag,
    	black_flag: black_flag,
    	rainbow_flag: rainbow_flag,
    	closed_lock_with_key: closed_lock_with_key,
    	lock: lock,
    	unlock: unlock,
    	lock_with_ink_pen: lock_with_ink_pen,
    	pen: pen,
    	fountain_pen: fountain_pen,
    	black_nib: black_nib,
    	memo: memo,
    	pencil2: pencil2,
    	crayon: crayon,
    	paintbrush: paintbrush,
    	mag: mag,
    	mag_right: mag_right,
    	heart: heart,
    	orange_heart: orange_heart,
    	yellow_heart: yellow_heart,
    	green_heart: green_heart,
    	blue_heart: blue_heart,
    	purple_heart: purple_heart,
    	black_heart: black_heart,
    	broken_heart: broken_heart,
    	heavy_heart_exclamation: heavy_heart_exclamation,
    	two_hearts: two_hearts,
    	revolving_hearts: revolving_hearts,
    	heartbeat: heartbeat,
    	heartpulse: heartpulse,
    	sparkling_heart: sparkling_heart,
    	cupid: cupid,
    	gift_heart: gift_heart,
    	heart_decoration: heart_decoration,
    	peace_symbol: peace_symbol,
    	latin_cross: latin_cross,
    	star_and_crescent: star_and_crescent,
    	om: om,
    	wheel_of_dharma: wheel_of_dharma,
    	star_of_david: star_of_david,
    	six_pointed_star: six_pointed_star,
    	menorah: menorah,
    	yin_yang: yin_yang,
    	orthodox_cross: orthodox_cross,
    	place_of_worship: place_of_worship,
    	ophiuchus: ophiuchus,
    	aries: aries,
    	taurus: taurus,
    	gemini: gemini,
    	cancer: cancer,
    	leo: leo,
    	virgo: virgo,
    	libra: libra,
    	scorpius: scorpius,
    	sagittarius: sagittarius,
    	capricorn: capricorn,
    	aquarius: aquarius,
    	pisces: pisces,
    	id: id,
    	atom_symbol: atom_symbol,
    	u7a7a: u7a7a,
    	u5272: u5272,
    	radioactive: radioactive,
    	biohazard: biohazard,
    	mobile_phone_off: mobile_phone_off,
    	vibration_mode: vibration_mode,
    	u6709: u6709,
    	u7121: u7121,
    	u7533: u7533,
    	u55b6: u55b6,
    	u6708: u6708,
    	eight_pointed_black_star: eight_pointed_black_star,
    	vs: vs,
    	accept: accept,
    	white_flower: white_flower,
    	ideograph_advantage: ideograph_advantage,
    	secret: secret,
    	congratulations: congratulations,
    	u5408: u5408,
    	u6e80: u6e80,
    	u7981: u7981,
    	a: a,
    	b: b,
    	ab: ab,
    	cl: cl,
    	o2: o2,
    	sos: sos,
    	no_entry: no_entry,
    	name_badge: name_badge,
    	no_entry_sign: no_entry_sign,
    	x: x,
    	o: o,
    	stop_sign: stop_sign,
    	anger: anger,
    	hotsprings: hotsprings,
    	no_pedestrians: no_pedestrians,
    	do_not_litter: do_not_litter,
    	no_bicycles: no_bicycles,
    	"non-potable_water": {
    	keywords: [
    		"drink",
    		"faucet",
    		"tap",
    		"circle"
    	],
    	char: "🚱",
    	fitzpatrick_scale: false,
    	category: "symbols"
    },
    	underage: underage,
    	no_mobile_phones: no_mobile_phones,
    	exclamation: exclamation,
    	grey_exclamation: grey_exclamation,
    	question: question,
    	grey_question: grey_question,
    	bangbang: bangbang,
    	interrobang: interrobang,
    	low_brightness: low_brightness,
    	high_brightness: high_brightness,
    	trident: trident,
    	fleur_de_lis: fleur_de_lis,
    	part_alternation_mark: part_alternation_mark,
    	warning: warning,
    	children_crossing: children_crossing,
    	beginner: beginner,
    	recycle: recycle,
    	u6307: u6307,
    	chart: chart,
    	sparkle: sparkle,
    	eight_spoked_asterisk: eight_spoked_asterisk,
    	negative_squared_cross_mark: negative_squared_cross_mark,
    	white_check_mark: white_check_mark,
    	diamond_shape_with_a_dot_inside: diamond_shape_with_a_dot_inside,
    	cyclone: cyclone,
    	loop: loop,
    	globe_with_meridians: globe_with_meridians,
    	m: m,
    	atm: atm,
    	sa: sa,
    	passport_control: passport_control,
    	customs: customs,
    	baggage_claim: baggage_claim,
    	left_luggage: left_luggage,
    	wheelchair: wheelchair,
    	no_smoking: no_smoking,
    	wc: wc,
    	parking: parking,
    	potable_water: potable_water,
    	mens: mens,
    	womens: womens,
    	baby_symbol: baby_symbol,
    	restroom: restroom,
    	put_litter_in_its_place: put_litter_in_its_place,
    	cinema: cinema,
    	signal_strength: signal_strength,
    	koko: koko,
    	ng: ng,
    	ok: ok,
    	up: up,
    	cool: cool,
    	"new": {
    	keywords: [
    		"blue-square",
    		"words",
    		"start"
    	],
    	char: "🆕",
    	fitzpatrick_scale: false,
    	category: "symbols"
    },
    	free: free,
    	zero: zero,
    	one: one,
    	two: two,
    	three: three,
    	four: four,
    	five: five,
    	six: six,
    	seven: seven,
    	eight: eight,
    	nine: nine,
    	keycap_ten: keycap_ten,
    	asterisk: asterisk,
    	eject_button: eject_button,
    	arrow_forward: arrow_forward,
    	pause_button: pause_button,
    	next_track_button: next_track_button,
    	stop_button: stop_button,
    	record_button: record_button,
    	play_or_pause_button: play_or_pause_button,
    	previous_track_button: previous_track_button,
    	fast_forward: fast_forward,
    	rewind: rewind,
    	twisted_rightwards_arrows: twisted_rightwards_arrows,
    	repeat: repeat,
    	repeat_one: repeat_one,
    	arrow_backward: arrow_backward,
    	arrow_up_small: arrow_up_small,
    	arrow_down_small: arrow_down_small,
    	arrow_double_up: arrow_double_up,
    	arrow_double_down: arrow_double_down,
    	arrow_right: arrow_right,
    	arrow_left: arrow_left,
    	arrow_up: arrow_up,
    	arrow_down: arrow_down,
    	arrow_upper_right: arrow_upper_right,
    	arrow_lower_right: arrow_lower_right,
    	arrow_lower_left: arrow_lower_left,
    	arrow_upper_left: arrow_upper_left,
    	arrow_up_down: arrow_up_down,
    	left_right_arrow: left_right_arrow,
    	arrows_counterclockwise: arrows_counterclockwise,
    	arrow_right_hook: arrow_right_hook,
    	leftwards_arrow_with_hook: leftwards_arrow_with_hook,
    	arrow_heading_up: arrow_heading_up,
    	arrow_heading_down: arrow_heading_down,
    	hash: hash,
    	information_source: information_source,
    	abc: abc,
    	abcd: abcd,
    	capital_abcd: capital_abcd,
    	symbols: symbols,
    	musical_note: musical_note,
    	notes: notes,
    	wavy_dash: wavy_dash,
    	curly_loop: curly_loop,
    	heavy_check_mark: heavy_check_mark,
    	arrows_clockwise: arrows_clockwise,
    	heavy_plus_sign: heavy_plus_sign,
    	heavy_minus_sign: heavy_minus_sign,
    	heavy_division_sign: heavy_division_sign,
    	heavy_multiplication_x: heavy_multiplication_x,
    	infinity: infinity,
    	heavy_dollar_sign: heavy_dollar_sign,
    	currency_exchange: currency_exchange,
    	copyright: copyright,
    	registered: registered,
    	tm: tm,
    	end: end,
    	back: back,
    	on: on,
    	top: top,
    	soon: soon,
    	ballot_box_with_check: ballot_box_with_check,
    	radio_button: radio_button,
    	white_circle: white_circle,
    	black_circle: black_circle,
    	red_circle: red_circle,
    	large_blue_circle: large_blue_circle,
    	small_orange_diamond: small_orange_diamond,
    	small_blue_diamond: small_blue_diamond,
    	large_orange_diamond: large_orange_diamond,
    	large_blue_diamond: large_blue_diamond,
    	small_red_triangle: small_red_triangle,
    	black_small_square: black_small_square,
    	white_small_square: white_small_square,
    	black_large_square: black_large_square,
    	white_large_square: white_large_square,
    	small_red_triangle_down: small_red_triangle_down,
    	black_medium_square: black_medium_square,
    	white_medium_square: white_medium_square,
    	black_medium_small_square: black_medium_small_square,
    	white_medium_small_square: white_medium_small_square,
    	black_square_button: black_square_button,
    	white_square_button: white_square_button,
    	speaker: speaker,
    	sound: sound,
    	loud_sound: loud_sound,
    	mute: mute,
    	mega: mega,
    	loudspeaker: loudspeaker,
    	bell: bell,
    	no_bell: no_bell,
    	black_joker: black_joker,
    	mahjong: mahjong,
    	spades: spades,
    	clubs: clubs,
    	hearts: hearts,
    	diamonds: diamonds,
    	flower_playing_cards: flower_playing_cards,
    	thought_balloon: thought_balloon,
    	right_anger_bubble: right_anger_bubble,
    	speech_balloon: speech_balloon,
    	left_speech_bubble: left_speech_bubble,
    	clock1: clock1,
    	clock2: clock2,
    	clock3: clock3,
    	clock4: clock4,
    	clock5: clock5,
    	clock6: clock6,
    	clock7: clock7,
    	clock8: clock8,
    	clock9: clock9,
    	clock10: clock10,
    	clock11: clock11,
    	clock12: clock12,
    	clock130: clock130,
    	clock230: clock230,
    	clock330: clock330,
    	clock430: clock430,
    	clock530: clock530,
    	clock630: clock630,
    	clock730: clock730,
    	clock830: clock830,
    	clock930: clock930,
    	clock1030: clock1030,
    	clock1130: clock1130,
    	clock1230: clock1230,
    	afghanistan: afghanistan,
    	aland_islands: aland_islands,
    	albania: albania,
    	algeria: algeria,
    	american_samoa: american_samoa,
    	andorra: andorra,
    	angola: angola,
    	anguilla: anguilla,
    	antarctica: antarctica,
    	antigua_barbuda: antigua_barbuda,
    	argentina: argentina,
    	armenia: armenia,
    	aruba: aruba,
    	australia: australia,
    	austria: austria,
    	azerbaijan: azerbaijan,
    	bahamas: bahamas,
    	bahrain: bahrain,
    	bangladesh: bangladesh,
    	barbados: barbados,
    	belarus: belarus,
    	belgium: belgium,
    	belize: belize,
    	benin: benin,
    	bermuda: bermuda,
    	bhutan: bhutan,
    	bolivia: bolivia,
    	caribbean_netherlands: caribbean_netherlands,
    	bosnia_herzegovina: bosnia_herzegovina,
    	botswana: botswana,
    	brazil: brazil,
    	british_indian_ocean_territory: british_indian_ocean_territory,
    	british_virgin_islands: british_virgin_islands,
    	brunei: brunei,
    	bulgaria: bulgaria,
    	burkina_faso: burkina_faso,
    	burundi: burundi,
    	cape_verde: cape_verde,
    	cambodia: cambodia,
    	cameroon: cameroon,
    	canada: canada,
    	canary_islands: canary_islands,
    	cayman_islands: cayman_islands,
    	central_african_republic: central_african_republic,
    	chad: chad,
    	chile: chile,
    	cn: cn,
    	christmas_island: christmas_island,
    	cocos_islands: cocos_islands,
    	colombia: colombia,
    	comoros: comoros,
    	congo_brazzaville: congo_brazzaville,
    	congo_kinshasa: congo_kinshasa,
    	cook_islands: cook_islands,
    	costa_rica: costa_rica,
    	croatia: croatia,
    	cuba: cuba,
    	curacao: curacao,
    	cyprus: cyprus,
    	czech_republic: czech_republic,
    	denmark: denmark,
    	djibouti: djibouti,
    	dominica: dominica,
    	dominican_republic: dominican_republic,
    	ecuador: ecuador,
    	egypt: egypt,
    	el_salvador: el_salvador,
    	equatorial_guinea: equatorial_guinea,
    	eritrea: eritrea,
    	estonia: estonia,
    	ethiopia: ethiopia,
    	eu: eu,
    	falkland_islands: falkland_islands,
    	faroe_islands: faroe_islands,
    	fiji: fiji,
    	finland: finland,
    	fr: fr,
    	french_guiana: french_guiana,
    	french_polynesia: french_polynesia,
    	french_southern_territories: french_southern_territories,
    	gabon: gabon,
    	gambia: gambia,
    	georgia: georgia,
    	de: de,
    	ghana: ghana,
    	gibraltar: gibraltar,
    	greece: greece,
    	greenland: greenland,
    	grenada: grenada,
    	guadeloupe: guadeloupe,
    	guam: guam,
    	guatemala: guatemala,
    	guernsey: guernsey,
    	guinea: guinea,
    	guinea_bissau: guinea_bissau,
    	guyana: guyana,
    	haiti: haiti,
    	honduras: honduras,
    	hong_kong: hong_kong,
    	hungary: hungary,
    	iceland: iceland,
    	india: india,
    	indonesia: indonesia,
    	iran: iran,
    	iraq: iraq,
    	ireland: ireland,
    	isle_of_man: isle_of_man,
    	israel: israel,
    	it: it,
    	cote_divoire: cote_divoire,
    	jamaica: jamaica,
    	jp: jp,
    	jersey: jersey,
    	jordan: jordan,
    	kazakhstan: kazakhstan,
    	kenya: kenya,
    	kiribati: kiribati,
    	kosovo: kosovo,
    	kuwait: kuwait,
    	kyrgyzstan: kyrgyzstan,
    	laos: laos,
    	latvia: latvia,
    	lebanon: lebanon,
    	lesotho: lesotho,
    	liberia: liberia,
    	libya: libya,
    	liechtenstein: liechtenstein,
    	lithuania: lithuania,
    	luxembourg: luxembourg,
    	macau: macau,
    	macedonia: macedonia,
    	madagascar: madagascar,
    	malawi: malawi,
    	malaysia: malaysia,
    	maldives: maldives,
    	mali: mali,
    	malta: malta,
    	marshall_islands: marshall_islands,
    	martinique: martinique,
    	mauritania: mauritania,
    	mauritius: mauritius,
    	mayotte: mayotte,
    	mexico: mexico,
    	micronesia: micronesia,
    	moldova: moldova,
    	monaco: monaco,
    	mongolia: mongolia,
    	montenegro: montenegro,
    	montserrat: montserrat,
    	morocco: morocco,
    	mozambique: mozambique,
    	myanmar: myanmar,
    	namibia: namibia,
    	nauru: nauru,
    	nepal: nepal,
    	netherlands: netherlands,
    	new_caledonia: new_caledonia,
    	new_zealand: new_zealand,
    	nicaragua: nicaragua,
    	niger: niger,
    	nigeria: nigeria,
    	niue: niue,
    	norfolk_island: norfolk_island,
    	northern_mariana_islands: northern_mariana_islands,
    	north_korea: north_korea,
    	norway: norway,
    	oman: oman,
    	pakistan: pakistan,
    	palau: palau,
    	palestinian_territories: palestinian_territories,
    	panama: panama,
    	papua_new_guinea: papua_new_guinea,
    	paraguay: paraguay,
    	peru: peru,
    	philippines: philippines,
    	pitcairn_islands: pitcairn_islands,
    	poland: poland,
    	portugal: portugal,
    	puerto_rico: puerto_rico,
    	qatar: qatar,
    	reunion: reunion,
    	romania: romania,
    	ru: ru,
    	rwanda: rwanda,
    	st_barthelemy: st_barthelemy,
    	st_helena: st_helena,
    	st_kitts_nevis: st_kitts_nevis,
    	st_lucia: st_lucia,
    	st_pierre_miquelon: st_pierre_miquelon,
    	st_vincent_grenadines: st_vincent_grenadines,
    	samoa: samoa,
    	san_marino: san_marino,
    	sao_tome_principe: sao_tome_principe,
    	saudi_arabia: saudi_arabia,
    	senegal: senegal,
    	serbia: serbia,
    	seychelles: seychelles,
    	sierra_leone: sierra_leone,
    	singapore: singapore,
    	sint_maarten: sint_maarten,
    	slovakia: slovakia,
    	slovenia: slovenia,
    	solomon_islands: solomon_islands,
    	somalia: somalia,
    	south_africa: south_africa,
    	south_georgia_south_sandwich_islands: south_georgia_south_sandwich_islands,
    	kr: kr,
    	south_sudan: south_sudan,
    	es: es,
    	sri_lanka: sri_lanka,
    	sudan: sudan,
    	suriname: suriname,
    	swaziland: swaziland,
    	sweden: sweden,
    	switzerland: switzerland,
    	syria: syria,
    	taiwan: taiwan,
    	tajikistan: tajikistan,
    	tanzania: tanzania,
    	thailand: thailand,
    	timor_leste: timor_leste,
    	togo: togo,
    	tokelau: tokelau,
    	tonga: tonga,
    	trinidad_tobago: trinidad_tobago,
    	tunisia: tunisia,
    	tr: tr,
    	turkmenistan: turkmenistan,
    	turks_caicos_islands: turks_caicos_islands,
    	tuvalu: tuvalu,
    	uganda: uganda,
    	ukraine: ukraine,
    	united_arab_emirates: united_arab_emirates,
    	uk: uk,
    	england: england,
    	scotland: scotland,
    	wales: wales,
    	us: us,
    	us_virgin_islands: us_virgin_islands,
    	uruguay: uruguay,
    	uzbekistan: uzbekistan,
    	vanuatu: vanuatu,
    	vatican_city: vatican_city,
    	venezuela: venezuela,
    	vietnam: vietnam,
    	wallis_futuna: wallis_futuna,
    	western_sahara: western_sahara,
    	yemen: yemen,
    	zambia: zambia,
    	zimbabwe: zimbabwe,
    	united_nations: united_nations,
    	pirate_flag: pirate_flag
    };

    var require$$1 = [
    	"grinning",
    	"smiley",
    	"smile",
    	"grin",
    	"laughing",
    	"sweat_smile",
    	"joy",
    	"rofl",
    	"relaxed",
    	"blush",
    	"innocent",
    	"slightly_smiling_face",
    	"upside_down_face",
    	"wink",
    	"relieved",
    	"heart_eyes",
    	"smiling_face_with_three_hearts",
    	"kissing_heart",
    	"kissing",
    	"kissing_smiling_eyes",
    	"kissing_closed_eyes",
    	"yum",
    	"stuck_out_tongue",
    	"stuck_out_tongue_closed_eyes",
    	"stuck_out_tongue_winking_eye",
    	"zany",
    	"raised_eyebrow",
    	"monocle",
    	"nerd_face",
    	"sunglasses",
    	"star_struck",
    	"partying",
    	"smirk",
    	"unamused",
    	"disappointed",
    	"pensive",
    	"worried",
    	"confused",
    	"slightly_frowning_face",
    	"frowning_face",
    	"persevere",
    	"confounded",
    	"tired_face",
    	"weary",
    	"pleading",
    	"cry",
    	"sob",
    	"triumph",
    	"angry",
    	"rage",
    	"symbols_over_mouth",
    	"exploding_head",
    	"flushed",
    	"hot",
    	"cold",
    	"scream",
    	"fearful",
    	"cold_sweat",
    	"disappointed_relieved",
    	"sweat",
    	"hugs",
    	"thinking",
    	"hand_over_mouth",
    	"shushing",
    	"lying_face",
    	"no_mouth",
    	"neutral_face",
    	"expressionless",
    	"grimacing",
    	"roll_eyes",
    	"hushed",
    	"frowning",
    	"anguished",
    	"open_mouth",
    	"astonished",
    	"sleeping",
    	"drooling_face",
    	"sleepy",
    	"dizzy_face",
    	"zipper_mouth_face",
    	"woozy",
    	"nauseated_face",
    	"vomiting",
    	"sneezing_face",
    	"mask",
    	"face_with_thermometer",
    	"face_with_head_bandage",
    	"money_mouth_face",
    	"cowboy_hat_face",
    	"smiling_imp",
    	"imp",
    	"japanese_ogre",
    	"japanese_goblin",
    	"clown_face",
    	"poop",
    	"ghost",
    	"skull",
    	"skull_and_crossbones",
    	"alien",
    	"space_invader",
    	"robot",
    	"jack_o_lantern",
    	"smiley_cat",
    	"smile_cat",
    	"joy_cat",
    	"heart_eyes_cat",
    	"smirk_cat",
    	"kissing_cat",
    	"scream_cat",
    	"crying_cat_face",
    	"pouting_cat",
    	"palms_up",
    	"open_hands",
    	"raised_hands",
    	"clap",
    	"handshake",
    	"+1",
    	"-1",
    	"facepunch",
    	"fist",
    	"fist_left",
    	"fist_right",
    	"crossed_fingers",
    	"v",
    	"love_you",
    	"metal",
    	"ok_hand",
    	"point_left",
    	"point_right",
    	"point_up",
    	"point_down",
    	"point_up_2",
    	"raised_hand",
    	"raised_back_of_hand",
    	"raised_hand_with_fingers_splayed",
    	"vulcan_salute",
    	"wave",
    	"call_me_hand",
    	"muscle",
    	"fu",
    	"writing_hand",
    	"pray",
    	"foot",
    	"leg",
    	"ring",
    	"lipstick",
    	"kiss",
    	"lips",
    	"tooth",
    	"tongue",
    	"ear",
    	"nose",
    	"footprints",
    	"eye",
    	"eyes",
    	"brain",
    	"speaking_head",
    	"bust_in_silhouette",
    	"busts_in_silhouette",
    	"baby",
    	"girl",
    	"child",
    	"boy",
    	"woman",
    	"adult",
    	"man",
    	"blonde_woman",
    	"blonde_man",
    	"bearded_person",
    	"older_woman",
    	"older_adult",
    	"older_man",
    	"man_with_gua_pi_mao",
    	"woman_with_headscarf",
    	"woman_with_turban",
    	"man_with_turban",
    	"policewoman",
    	"policeman",
    	"construction_worker_woman",
    	"construction_worker_man",
    	"guardswoman",
    	"guardsman",
    	"female_detective",
    	"male_detective",
    	"woman_health_worker",
    	"man_health_worker",
    	"woman_farmer",
    	"man_farmer",
    	"woman_cook",
    	"man_cook",
    	"woman_student",
    	"man_student",
    	"woman_singer",
    	"man_singer",
    	"woman_teacher",
    	"man_teacher",
    	"woman_factory_worker",
    	"man_factory_worker",
    	"woman_technologist",
    	"man_technologist",
    	"woman_office_worker",
    	"man_office_worker",
    	"woman_mechanic",
    	"man_mechanic",
    	"woman_scientist",
    	"man_scientist",
    	"woman_artist",
    	"man_artist",
    	"woman_firefighter",
    	"man_firefighter",
    	"woman_pilot",
    	"man_pilot",
    	"woman_astronaut",
    	"man_astronaut",
    	"woman_judge",
    	"man_judge",
    	"bride_with_veil",
    	"man_in_tuxedo",
    	"princess",
    	"prince",
    	"woman_superhero",
    	"man_superhero",
    	"woman_supervillain",
    	"man_supervillain",
    	"mrs_claus",
    	"santa",
    	"sorceress",
    	"wizard",
    	"woman_elf",
    	"man_elf",
    	"woman_vampire",
    	"man_vampire",
    	"woman_zombie",
    	"man_zombie",
    	"woman_genie",
    	"man_genie",
    	"mermaid",
    	"merman",
    	"woman_fairy",
    	"man_fairy",
    	"angel",
    	"pregnant_woman",
    	"breastfeeding",
    	"bowing_woman",
    	"bowing_man",
    	"tipping_hand_woman",
    	"tipping_hand_man",
    	"no_good_woman",
    	"no_good_man",
    	"ok_woman",
    	"ok_man",
    	"raising_hand_woman",
    	"raising_hand_man",
    	"woman_facepalming",
    	"man_facepalming",
    	"woman_shrugging",
    	"man_shrugging",
    	"pouting_woman",
    	"pouting_man",
    	"frowning_woman",
    	"frowning_man",
    	"haircut_woman",
    	"haircut_man",
    	"massage_woman",
    	"massage_man",
    	"woman_in_steamy_room",
    	"man_in_steamy_room",
    	"nail_care",
    	"selfie",
    	"dancer",
    	"man_dancing",
    	"dancing_women",
    	"dancing_men",
    	"business_suit_levitating",
    	"walking_woman",
    	"walking_man",
    	"running_woman",
    	"running_man",
    	"couple",
    	"two_women_holding_hands",
    	"two_men_holding_hands",
    	"couple_with_heart_woman_man",
    	"couple_with_heart_woman_woman",
    	"couple_with_heart_man_man",
    	"couplekiss_man_woman",
    	"couplekiss_woman_woman",
    	"couplekiss_man_man",
    	"family_man_woman_boy",
    	"family_man_woman_girl",
    	"family_man_woman_girl_boy",
    	"family_man_woman_boy_boy",
    	"family_man_woman_girl_girl",
    	"family_woman_woman_boy",
    	"family_woman_woman_girl",
    	"family_woman_woman_girl_boy",
    	"family_woman_woman_boy_boy",
    	"family_woman_woman_girl_girl",
    	"family_man_man_boy",
    	"family_man_man_girl",
    	"family_man_man_girl_boy",
    	"family_man_man_boy_boy",
    	"family_man_man_girl_girl",
    	"family_woman_boy",
    	"family_woman_girl",
    	"family_woman_girl_boy",
    	"family_woman_boy_boy",
    	"family_woman_girl_girl",
    	"family_man_boy",
    	"family_man_girl",
    	"family_man_girl_boy",
    	"family_man_boy_boy",
    	"family_man_girl_girl",
    	"yarn",
    	"thread",
    	"coat",
    	"labcoat",
    	"womans_clothes",
    	"tshirt",
    	"jeans",
    	"necktie",
    	"dress",
    	"bikini",
    	"kimono",
    	"flat_shoe",
    	"high_heel",
    	"sandal",
    	"boot",
    	"mans_shoe",
    	"athletic_shoe",
    	"hiking_boot",
    	"socks",
    	"gloves",
    	"scarf",
    	"tophat",
    	"billed_hat",
    	"womans_hat",
    	"mortar_board",
    	"rescue_worker_helmet",
    	"crown",
    	"pouch",
    	"purse",
    	"handbag",
    	"briefcase",
    	"school_satchel",
    	"luggage",
    	"eyeglasses",
    	"dark_sunglasses",
    	"goggles",
    	"closed_umbrella",
    	"dog",
    	"cat",
    	"mouse",
    	"hamster",
    	"rabbit",
    	"fox_face",
    	"bear",
    	"panda_face",
    	"koala",
    	"tiger",
    	"lion",
    	"cow",
    	"pig",
    	"pig_nose",
    	"frog",
    	"monkey_face",
    	"see_no_evil",
    	"hear_no_evil",
    	"speak_no_evil",
    	"monkey",
    	"chicken",
    	"penguin",
    	"bird",
    	"baby_chick",
    	"hatching_chick",
    	"hatched_chick",
    	"duck",
    	"eagle",
    	"owl",
    	"bat",
    	"wolf",
    	"boar",
    	"horse",
    	"unicorn",
    	"honeybee",
    	"bug",
    	"butterfly",
    	"snail",
    	"shell",
    	"beetle",
    	"ant",
    	"mosquito",
    	"grasshopper",
    	"spider",
    	"spider_web",
    	"scorpion",
    	"turtle",
    	"snake",
    	"lizard",
    	"t-rex",
    	"sauropod",
    	"octopus",
    	"squid",
    	"shrimp",
    	"lobster",
    	"crab",
    	"blowfish",
    	"tropical_fish",
    	"fish",
    	"dolphin",
    	"whale",
    	"whale2",
    	"shark",
    	"crocodile",
    	"tiger2",
    	"leopard",
    	"zebra",
    	"gorilla",
    	"elephant",
    	"hippopotamus",
    	"rhinoceros",
    	"dromedary_camel",
    	"giraffe",
    	"kangaroo",
    	"camel",
    	"water_buffalo",
    	"ox",
    	"cow2",
    	"racehorse",
    	"pig2",
    	"ram",
    	"sheep",
    	"llama",
    	"goat",
    	"deer",
    	"dog2",
    	"poodle",
    	"cat2",
    	"rooster",
    	"turkey",
    	"peacock",
    	"parrot",
    	"swan",
    	"dove",
    	"rabbit2",
    	"raccoon",
    	"badger",
    	"rat",
    	"mouse2",
    	"chipmunk",
    	"hedgehog",
    	"paw_prints",
    	"dragon",
    	"dragon_face",
    	"cactus",
    	"christmas_tree",
    	"evergreen_tree",
    	"deciduous_tree",
    	"palm_tree",
    	"seedling",
    	"herb",
    	"shamrock",
    	"four_leaf_clover",
    	"bamboo",
    	"tanabata_tree",
    	"leaves",
    	"fallen_leaf",
    	"maple_leaf",
    	"ear_of_rice",
    	"hibiscus",
    	"sunflower",
    	"rose",
    	"wilted_flower",
    	"tulip",
    	"blossom",
    	"cherry_blossom",
    	"bouquet",
    	"mushroom",
    	"earth_americas",
    	"earth_africa",
    	"earth_asia",
    	"full_moon",
    	"waning_gibbous_moon",
    	"last_quarter_moon",
    	"waning_crescent_moon",
    	"new_moon",
    	"waxing_crescent_moon",
    	"first_quarter_moon",
    	"waxing_gibbous_moon",
    	"new_moon_with_face",
    	"full_moon_with_face",
    	"first_quarter_moon_with_face",
    	"last_quarter_moon_with_face",
    	"sun_with_face",
    	"crescent_moon",
    	"star",
    	"star2",
    	"dizzy",
    	"sparkles",
    	"comet",
    	"sunny",
    	"sun_behind_small_cloud",
    	"partly_sunny",
    	"sun_behind_large_cloud",
    	"sun_behind_rain_cloud",
    	"cloud",
    	"cloud_with_rain",
    	"cloud_with_lightning_and_rain",
    	"cloud_with_lightning",
    	"zap",
    	"fire",
    	"boom",
    	"snowflake",
    	"cloud_with_snow",
    	"snowman",
    	"snowman_with_snow",
    	"wind_face",
    	"dash",
    	"tornado",
    	"fog",
    	"open_umbrella",
    	"umbrella",
    	"droplet",
    	"sweat_drops",
    	"ocean",
    	"green_apple",
    	"apple",
    	"pear",
    	"tangerine",
    	"lemon",
    	"banana",
    	"watermelon",
    	"grapes",
    	"strawberry",
    	"melon",
    	"cherries",
    	"peach",
    	"mango",
    	"pineapple",
    	"coconut",
    	"kiwi_fruit",
    	"tomato",
    	"eggplant",
    	"avocado",
    	"broccoli",
    	"leafy_greens",
    	"cucumber",
    	"hot_pepper",
    	"corn",
    	"carrot",
    	"potato",
    	"sweet_potato",
    	"croissant",
    	"bagel",
    	"bread",
    	"baguette_bread",
    	"pretzel",
    	"cheese",
    	"egg",
    	"fried_egg",
    	"pancakes",
    	"bacon",
    	"steak",
    	"poultry_leg",
    	"meat_on_bone",
    	"bone",
    	"hotdog",
    	"hamburger",
    	"fries",
    	"pizza",
    	"sandwich",
    	"stuffed_flatbread",
    	"taco",
    	"burrito",
    	"green_salad",
    	"shallow_pan_of_food",
    	"canned_food",
    	"spaghetti",
    	"ramen",
    	"stew",
    	"curry",
    	"sushi",
    	"bento",
    	"fried_shrimp",
    	"rice_ball",
    	"rice",
    	"rice_cracker",
    	"fish_cake",
    	"fortune_cookie",
    	"moon_cake",
    	"oden",
    	"dango",
    	"shaved_ice",
    	"ice_cream",
    	"icecream",
    	"pie",
    	"cupcake",
    	"cake",
    	"birthday",
    	"custard",
    	"lollipop",
    	"candy",
    	"chocolate_bar",
    	"popcorn",
    	"doughnut",
    	"dumpling",
    	"cookie",
    	"chestnut",
    	"peanuts",
    	"honey_pot",
    	"milk_glass",
    	"baby_bottle",
    	"coffee",
    	"tea",
    	"cup_with_straw",
    	"sake",
    	"beer",
    	"beers",
    	"clinking_glasses",
    	"wine_glass",
    	"tumbler_glass",
    	"cocktail",
    	"tropical_drink",
    	"champagne",
    	"spoon",
    	"fork_and_knife",
    	"plate_with_cutlery",
    	"bowl_with_spoon",
    	"takeout_box",
    	"chopsticks",
    	"salt",
    	"soccer",
    	"basketball",
    	"football",
    	"baseball",
    	"softball",
    	"tennis",
    	"volleyball",
    	"rugby_football",
    	"flying_disc",
    	"8ball",
    	"golf",
    	"golfing_woman",
    	"golfing_man",
    	"ping_pong",
    	"badminton",
    	"goal_net",
    	"ice_hockey",
    	"field_hockey",
    	"lacrosse",
    	"cricket",
    	"ski",
    	"skier",
    	"snowboarder",
    	"person_fencing",
    	"women_wrestling",
    	"men_wrestling",
    	"woman_cartwheeling",
    	"man_cartwheeling",
    	"woman_playing_handball",
    	"man_playing_handball",
    	"ice_skate",
    	"curling_stone",
    	"skateboard",
    	"sled",
    	"bow_and_arrow",
    	"fishing_pole_and_fish",
    	"boxing_glove",
    	"martial_arts_uniform",
    	"rowing_woman",
    	"rowing_man",
    	"climbing_woman",
    	"climbing_man",
    	"swimming_woman",
    	"swimming_man",
    	"woman_playing_water_polo",
    	"man_playing_water_polo",
    	"woman_in_lotus_position",
    	"man_in_lotus_position",
    	"surfing_woman",
    	"surfing_man",
    	"basketball_woman",
    	"basketball_man",
    	"weight_lifting_woman",
    	"weight_lifting_man",
    	"biking_woman",
    	"biking_man",
    	"mountain_biking_woman",
    	"mountain_biking_man",
    	"horse_racing",
    	"trophy",
    	"running_shirt_with_sash",
    	"medal_sports",
    	"medal_military",
    	"1st_place_medal",
    	"2nd_place_medal",
    	"3rd_place_medal",
    	"reminder_ribbon",
    	"rosette",
    	"ticket",
    	"tickets",
    	"performing_arts",
    	"art",
    	"circus_tent",
    	"woman_juggling",
    	"man_juggling",
    	"microphone",
    	"headphones",
    	"musical_score",
    	"musical_keyboard",
    	"drum",
    	"saxophone",
    	"trumpet",
    	"guitar",
    	"violin",
    	"clapper",
    	"video_game",
    	"dart",
    	"game_die",
    	"chess_pawn",
    	"slot_machine",
    	"jigsaw",
    	"bowling",
    	"red_car",
    	"taxi",
    	"blue_car",
    	"bus",
    	"trolleybus",
    	"racing_car",
    	"police_car",
    	"ambulance",
    	"fire_engine",
    	"minibus",
    	"truck",
    	"articulated_lorry",
    	"tractor",
    	"kick_scooter",
    	"motorcycle",
    	"bike",
    	"motor_scooter",
    	"rotating_light",
    	"oncoming_police_car",
    	"oncoming_bus",
    	"oncoming_automobile",
    	"oncoming_taxi",
    	"aerial_tramway",
    	"mountain_cableway",
    	"suspension_railway",
    	"railway_car",
    	"train",
    	"monorail",
    	"bullettrain_side",
    	"bullettrain_front",
    	"light_rail",
    	"mountain_railway",
    	"steam_locomotive",
    	"train2",
    	"metro",
    	"tram",
    	"station",
    	"flying_saucer",
    	"helicopter",
    	"small_airplane",
    	"airplane",
    	"flight_departure",
    	"flight_arrival",
    	"sailboat",
    	"motor_boat",
    	"speedboat",
    	"ferry",
    	"passenger_ship",
    	"rocket",
    	"artificial_satellite",
    	"seat",
    	"canoe",
    	"anchor",
    	"construction",
    	"fuelpump",
    	"busstop",
    	"vertical_traffic_light",
    	"traffic_light",
    	"ship",
    	"ferris_wheel",
    	"roller_coaster",
    	"carousel_horse",
    	"building_construction",
    	"foggy",
    	"tokyo_tower",
    	"factory",
    	"fountain",
    	"rice_scene",
    	"mountain",
    	"mountain_snow",
    	"mount_fuji",
    	"volcano",
    	"japan",
    	"camping",
    	"tent",
    	"national_park",
    	"motorway",
    	"railway_track",
    	"sunrise",
    	"sunrise_over_mountains",
    	"desert",
    	"beach_umbrella",
    	"desert_island",
    	"city_sunrise",
    	"city_sunset",
    	"cityscape",
    	"night_with_stars",
    	"bridge_at_night",
    	"milky_way",
    	"stars",
    	"sparkler",
    	"fireworks",
    	"rainbow",
    	"houses",
    	"european_castle",
    	"japanese_castle",
    	"stadium",
    	"statue_of_liberty",
    	"house",
    	"house_with_garden",
    	"derelict_house",
    	"office",
    	"department_store",
    	"post_office",
    	"european_post_office",
    	"hospital",
    	"bank",
    	"hotel",
    	"convenience_store",
    	"school",
    	"love_hotel",
    	"wedding",
    	"classical_building",
    	"church",
    	"mosque",
    	"synagogue",
    	"kaaba",
    	"shinto_shrine",
    	"watch",
    	"iphone",
    	"calling",
    	"computer",
    	"keyboard",
    	"desktop_computer",
    	"printer",
    	"computer_mouse",
    	"trackball",
    	"joystick",
    	"clamp",
    	"minidisc",
    	"floppy_disk",
    	"cd",
    	"dvd",
    	"vhs",
    	"camera",
    	"camera_flash",
    	"video_camera",
    	"movie_camera",
    	"film_projector",
    	"film_strip",
    	"telephone_receiver",
    	"phone",
    	"pager",
    	"fax",
    	"tv",
    	"radio",
    	"studio_microphone",
    	"level_slider",
    	"control_knobs",
    	"compass",
    	"stopwatch",
    	"timer_clock",
    	"alarm_clock",
    	"mantelpiece_clock",
    	"hourglass_flowing_sand",
    	"hourglass",
    	"satellite",
    	"battery",
    	"electric_plug",
    	"bulb",
    	"flashlight",
    	"candle",
    	"fire_extinguisher",
    	"wastebasket",
    	"oil_drum",
    	"money_with_wings",
    	"dollar",
    	"yen",
    	"euro",
    	"pound",
    	"moneybag",
    	"credit_card",
    	"gem",
    	"balance_scale",
    	"toolbox",
    	"wrench",
    	"hammer",
    	"hammer_and_pick",
    	"hammer_and_wrench",
    	"pick",
    	"nut_and_bolt",
    	"gear",
    	"brick",
    	"chains",
    	"magnet",
    	"gun",
    	"bomb",
    	"firecracker",
    	"hocho",
    	"dagger",
    	"crossed_swords",
    	"shield",
    	"smoking",
    	"coffin",
    	"funeral_urn",
    	"amphora",
    	"crystal_ball",
    	"prayer_beads",
    	"nazar_amulet",
    	"barber",
    	"alembic",
    	"telescope",
    	"microscope",
    	"hole",
    	"pill",
    	"syringe",
    	"dna",
    	"microbe",
    	"petri_dish",
    	"test_tube",
    	"thermometer",
    	"broom",
    	"basket",
    	"toilet_paper",
    	"label",
    	"bookmark",
    	"toilet",
    	"shower",
    	"bathtub",
    	"bath",
    	"soap",
    	"sponge",
    	"lotion_bottle",
    	"key",
    	"old_key",
    	"couch_and_lamp",
    	"sleeping_bed",
    	"bed",
    	"door",
    	"bellhop_bell",
    	"teddy_bear",
    	"framed_picture",
    	"world_map",
    	"parasol_on_ground",
    	"moyai",
    	"shopping",
    	"shopping_cart",
    	"balloon",
    	"flags",
    	"ribbon",
    	"gift",
    	"confetti_ball",
    	"tada",
    	"dolls",
    	"wind_chime",
    	"crossed_flags",
    	"izakaya_lantern",
    	"red_envelope",
    	"email",
    	"envelope_with_arrow",
    	"incoming_envelope",
    	"e-mail",
    	"love_letter",
    	"postbox",
    	"mailbox_closed",
    	"mailbox",
    	"mailbox_with_mail",
    	"mailbox_with_no_mail",
    	"package",
    	"postal_horn",
    	"inbox_tray",
    	"outbox_tray",
    	"scroll",
    	"page_with_curl",
    	"bookmark_tabs",
    	"receipt",
    	"bar_chart",
    	"chart_with_upwards_trend",
    	"chart_with_downwards_trend",
    	"page_facing_up",
    	"date",
    	"calendar",
    	"spiral_calendar",
    	"card_index",
    	"card_file_box",
    	"ballot_box",
    	"file_cabinet",
    	"clipboard",
    	"spiral_notepad",
    	"file_folder",
    	"open_file_folder",
    	"card_index_dividers",
    	"newspaper_roll",
    	"newspaper",
    	"notebook",
    	"closed_book",
    	"green_book",
    	"blue_book",
    	"orange_book",
    	"notebook_with_decorative_cover",
    	"ledger",
    	"books",
    	"open_book",
    	"safety_pin",
    	"link",
    	"paperclip",
    	"paperclips",
    	"scissors",
    	"triangular_ruler",
    	"straight_ruler",
    	"abacus",
    	"pushpin",
    	"round_pushpin",
    	"closed_lock_with_key",
    	"lock",
    	"unlock",
    	"lock_with_ink_pen",
    	"pen",
    	"fountain_pen",
    	"black_nib",
    	"memo",
    	"pencil2",
    	"crayon",
    	"paintbrush",
    	"mag",
    	"mag_right",
    	"heart",
    	"orange_heart",
    	"yellow_heart",
    	"green_heart",
    	"blue_heart",
    	"purple_heart",
    	"black_heart",
    	"broken_heart",
    	"heavy_heart_exclamation",
    	"two_hearts",
    	"revolving_hearts",
    	"heartbeat",
    	"heartpulse",
    	"sparkling_heart",
    	"cupid",
    	"gift_heart",
    	"heart_decoration",
    	"peace_symbol",
    	"latin_cross",
    	"star_and_crescent",
    	"om",
    	"wheel_of_dharma",
    	"star_of_david",
    	"six_pointed_star",
    	"menorah",
    	"yin_yang",
    	"orthodox_cross",
    	"place_of_worship",
    	"ophiuchus",
    	"aries",
    	"taurus",
    	"gemini",
    	"cancer",
    	"leo",
    	"virgo",
    	"libra",
    	"scorpius",
    	"sagittarius",
    	"capricorn",
    	"aquarius",
    	"pisces",
    	"id",
    	"atom_symbol",
    	"u7a7a",
    	"u5272",
    	"radioactive",
    	"biohazard",
    	"mobile_phone_off",
    	"vibration_mode",
    	"u6709",
    	"u7121",
    	"u7533",
    	"u55b6",
    	"u6708",
    	"eight_pointed_black_star",
    	"vs",
    	"accept",
    	"white_flower",
    	"ideograph_advantage",
    	"secret",
    	"congratulations",
    	"u5408",
    	"u6e80",
    	"u7981",
    	"a",
    	"b",
    	"ab",
    	"cl",
    	"o2",
    	"sos",
    	"no_entry",
    	"name_badge",
    	"no_entry_sign",
    	"x",
    	"o",
    	"stop_sign",
    	"anger",
    	"hotsprings",
    	"no_pedestrians",
    	"do_not_litter",
    	"no_bicycles",
    	"non-potable_water",
    	"underage",
    	"no_mobile_phones",
    	"exclamation",
    	"grey_exclamation",
    	"question",
    	"grey_question",
    	"bangbang",
    	"interrobang",
    	"100",
    	"low_brightness",
    	"high_brightness",
    	"trident",
    	"fleur_de_lis",
    	"part_alternation_mark",
    	"warning",
    	"children_crossing",
    	"beginner",
    	"recycle",
    	"u6307",
    	"chart",
    	"sparkle",
    	"eight_spoked_asterisk",
    	"negative_squared_cross_mark",
    	"white_check_mark",
    	"diamond_shape_with_a_dot_inside",
    	"cyclone",
    	"loop",
    	"globe_with_meridians",
    	"m",
    	"atm",
    	"zzz",
    	"sa",
    	"passport_control",
    	"customs",
    	"baggage_claim",
    	"left_luggage",
    	"wheelchair",
    	"no_smoking",
    	"wc",
    	"parking",
    	"potable_water",
    	"mens",
    	"womens",
    	"baby_symbol",
    	"restroom",
    	"put_litter_in_its_place",
    	"cinema",
    	"signal_strength",
    	"koko",
    	"ng",
    	"ok",
    	"up",
    	"cool",
    	"new",
    	"free",
    	"zero",
    	"one",
    	"two",
    	"three",
    	"four",
    	"five",
    	"six",
    	"seven",
    	"eight",
    	"nine",
    	"keycap_ten",
    	"asterisk",
    	"1234",
    	"eject_button",
    	"arrow_forward",
    	"pause_button",
    	"next_track_button",
    	"stop_button",
    	"record_button",
    	"play_or_pause_button",
    	"previous_track_button",
    	"fast_forward",
    	"rewind",
    	"twisted_rightwards_arrows",
    	"repeat",
    	"repeat_one",
    	"arrow_backward",
    	"arrow_up_small",
    	"arrow_down_small",
    	"arrow_double_up",
    	"arrow_double_down",
    	"arrow_right",
    	"arrow_left",
    	"arrow_up",
    	"arrow_down",
    	"arrow_upper_right",
    	"arrow_lower_right",
    	"arrow_lower_left",
    	"arrow_upper_left",
    	"arrow_up_down",
    	"left_right_arrow",
    	"arrows_counterclockwise",
    	"arrow_right_hook",
    	"leftwards_arrow_with_hook",
    	"arrow_heading_up",
    	"arrow_heading_down",
    	"hash",
    	"information_source",
    	"abc",
    	"abcd",
    	"capital_abcd",
    	"symbols",
    	"musical_note",
    	"notes",
    	"wavy_dash",
    	"curly_loop",
    	"heavy_check_mark",
    	"arrows_clockwise",
    	"heavy_plus_sign",
    	"heavy_minus_sign",
    	"heavy_division_sign",
    	"heavy_multiplication_x",
    	"infinity",
    	"heavy_dollar_sign",
    	"currency_exchange",
    	"copyright",
    	"registered",
    	"tm",
    	"end",
    	"back",
    	"on",
    	"top",
    	"soon",
    	"ballot_box_with_check",
    	"radio_button",
    	"white_circle",
    	"black_circle",
    	"red_circle",
    	"large_blue_circle",
    	"small_orange_diamond",
    	"small_blue_diamond",
    	"large_orange_diamond",
    	"large_blue_diamond",
    	"small_red_triangle",
    	"black_small_square",
    	"white_small_square",
    	"black_large_square",
    	"white_large_square",
    	"small_red_triangle_down",
    	"black_medium_square",
    	"white_medium_square",
    	"black_medium_small_square",
    	"white_medium_small_square",
    	"black_square_button",
    	"white_square_button",
    	"speaker",
    	"sound",
    	"loud_sound",
    	"mute",
    	"mega",
    	"loudspeaker",
    	"bell",
    	"no_bell",
    	"black_joker",
    	"mahjong",
    	"spades",
    	"clubs",
    	"hearts",
    	"diamonds",
    	"flower_playing_cards",
    	"thought_balloon",
    	"right_anger_bubble",
    	"speech_balloon",
    	"left_speech_bubble",
    	"clock1",
    	"clock2",
    	"clock3",
    	"clock4",
    	"clock5",
    	"clock6",
    	"clock7",
    	"clock8",
    	"clock9",
    	"clock10",
    	"clock11",
    	"clock12",
    	"clock130",
    	"clock230",
    	"clock330",
    	"clock430",
    	"clock530",
    	"clock630",
    	"clock730",
    	"clock830",
    	"clock930",
    	"clock1030",
    	"clock1130",
    	"clock1230",
    	"white_flag",
    	"black_flag",
    	"pirate_flag",
    	"checkered_flag",
    	"triangular_flag_on_post",
    	"rainbow_flag",
    	"united_nations",
    	"afghanistan",
    	"aland_islands",
    	"albania",
    	"algeria",
    	"american_samoa",
    	"andorra",
    	"angola",
    	"anguilla",
    	"antarctica",
    	"antigua_barbuda",
    	"argentina",
    	"armenia",
    	"aruba",
    	"australia",
    	"austria",
    	"azerbaijan",
    	"bahamas",
    	"bahrain",
    	"bangladesh",
    	"barbados",
    	"belarus",
    	"belgium",
    	"belize",
    	"benin",
    	"bermuda",
    	"bhutan",
    	"bolivia",
    	"caribbean_netherlands",
    	"bosnia_herzegovina",
    	"botswana",
    	"brazil",
    	"british_indian_ocean_territory",
    	"british_virgin_islands",
    	"brunei",
    	"bulgaria",
    	"burkina_faso",
    	"burundi",
    	"cape_verde",
    	"cambodia",
    	"cameroon",
    	"canada",
    	"canary_islands",
    	"cayman_islands",
    	"central_african_republic",
    	"chad",
    	"chile",
    	"cn",
    	"christmas_island",
    	"cocos_islands",
    	"colombia",
    	"comoros",
    	"congo_brazzaville",
    	"congo_kinshasa",
    	"cook_islands",
    	"costa_rica",
    	"croatia",
    	"cuba",
    	"curacao",
    	"cyprus",
    	"czech_republic",
    	"denmark",
    	"djibouti",
    	"dominica",
    	"dominican_republic",
    	"ecuador",
    	"egypt",
    	"el_salvador",
    	"equatorial_guinea",
    	"eritrea",
    	"estonia",
    	"ethiopia",
    	"eu",
    	"falkland_islands",
    	"faroe_islands",
    	"fiji",
    	"finland",
    	"fr",
    	"french_guiana",
    	"french_polynesia",
    	"french_southern_territories",
    	"gabon",
    	"gambia",
    	"georgia",
    	"de",
    	"ghana",
    	"gibraltar",
    	"greece",
    	"greenland",
    	"grenada",
    	"guadeloupe",
    	"guam",
    	"guatemala",
    	"guernsey",
    	"guinea",
    	"guinea_bissau",
    	"guyana",
    	"haiti",
    	"honduras",
    	"hong_kong",
    	"hungary",
    	"iceland",
    	"india",
    	"indonesia",
    	"iran",
    	"iraq",
    	"ireland",
    	"isle_of_man",
    	"israel",
    	"it",
    	"cote_divoire",
    	"jamaica",
    	"jp",
    	"jersey",
    	"jordan",
    	"kazakhstan",
    	"kenya",
    	"kiribati",
    	"kosovo",
    	"kuwait",
    	"kyrgyzstan",
    	"laos",
    	"latvia",
    	"lebanon",
    	"lesotho",
    	"liberia",
    	"libya",
    	"liechtenstein",
    	"lithuania",
    	"luxembourg",
    	"macau",
    	"macedonia",
    	"madagascar",
    	"malawi",
    	"malaysia",
    	"maldives",
    	"mali",
    	"malta",
    	"marshall_islands",
    	"martinique",
    	"mauritania",
    	"mauritius",
    	"mayotte",
    	"mexico",
    	"micronesia",
    	"moldova",
    	"monaco",
    	"mongolia",
    	"montenegro",
    	"montserrat",
    	"morocco",
    	"mozambique",
    	"myanmar",
    	"namibia",
    	"nauru",
    	"nepal",
    	"netherlands",
    	"new_caledonia",
    	"new_zealand",
    	"nicaragua",
    	"niger",
    	"nigeria",
    	"niue",
    	"norfolk_island",
    	"northern_mariana_islands",
    	"north_korea",
    	"norway",
    	"oman",
    	"pakistan",
    	"palau",
    	"palestinian_territories",
    	"panama",
    	"papua_new_guinea",
    	"paraguay",
    	"peru",
    	"philippines",
    	"pitcairn_islands",
    	"poland",
    	"portugal",
    	"puerto_rico",
    	"qatar",
    	"reunion",
    	"romania",
    	"ru",
    	"rwanda",
    	"st_barthelemy",
    	"st_helena",
    	"st_kitts_nevis",
    	"st_lucia",
    	"st_pierre_miquelon",
    	"st_vincent_grenadines",
    	"samoa",
    	"san_marino",
    	"sao_tome_principe",
    	"saudi_arabia",
    	"senegal",
    	"serbia",
    	"seychelles",
    	"sierra_leone",
    	"singapore",
    	"sint_maarten",
    	"slovakia",
    	"slovenia",
    	"solomon_islands",
    	"somalia",
    	"south_africa",
    	"south_georgia_south_sandwich_islands",
    	"kr",
    	"south_sudan",
    	"es",
    	"sri_lanka",
    	"sudan",
    	"suriname",
    	"swaziland",
    	"sweden",
    	"switzerland",
    	"syria",
    	"taiwan",
    	"tajikistan",
    	"tanzania",
    	"thailand",
    	"timor_leste",
    	"togo",
    	"tokelau",
    	"tonga",
    	"trinidad_tobago",
    	"tunisia",
    	"tr",
    	"turkmenistan",
    	"turks_caicos_islands",
    	"tuvalu",
    	"uganda",
    	"ukraine",
    	"united_arab_emirates",
    	"uk",
    	"england",
    	"scotland",
    	"wales",
    	"us",
    	"us_virgin_islands",
    	"uruguay",
    	"uzbekistan",
    	"vanuatu",
    	"vatican_city",
    	"venezuela",
    	"vietnam",
    	"wallis_futuna",
    	"western_sahara",
    	"yemen",
    	"zambia",
    	"zimbabwe"
    ];

    var emojilib = {
      lib: require$$0,
      ordered: require$$1,
      fitzpatrick_scale_modifiers: ["🏻", "🏼", "🏽", "🏾", "🏿"]
    };

    var lib = createCommonjsModule(function (module) {



    var emoji = emojilib;

    var nameMap = module.exports = {};
    nameMap.emoji = lib$1(emoji.lib, function (value) {
        return value.char;
    }, true);
    lib$2(nameMap.emoji, function (value, name, obj) {
        return !value && delete obj[name] || true;
    });

    /**
     * get
     * Gets the emoji character (unicode) by providing the name.
     *
     * @name get
     * @function
     * @param {String} name The emoji name.
     * @return {String} The emoji character (unicode).
     */
    nameMap.get = function (name) {
        if (name.charAt(0) === ":") {
            name = name.slice(1, -1);
        }
        return this.emoji[name];
    };

    emoji = null;
    });

    var nameMap = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(null), lib, {
        'default': lib
    }));

    const settings = {
      imageFolder: 'assets/images/resized',
      imageExtension: '.png'
    };

    /* src/Menu.svelte generated by Svelte v3.38.3 */
    const file$3 = "src/Menu.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let input0;
    	let input0_disabled_value;
    	let t0;
    	let label0;
    	let t2;
    	let div1;
    	let input1;
    	let input1_disabled_value;
    	let t3;
    	let label1;
    	let t5;
    	let div3;
    	let button0;
    	let span0;
    	let t7;
    	let t8;
    	let button1;
    	let span1;
    	let t10;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			label0 = element("label");
    			label0.textContent = "Group answers";
    			t2 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t3 = space();
    			label1 = element("label");
    			label1.textContent = "Hide missing";
    			t5 = space();
    			div3 = element("div");
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "Previous";
    			t7 = text$1(" ←");
    			t8 = space();
    			button1 = element("button");
    			span1 = element("span");
    			span1.textContent = "Next";
    			t10 = text$1(" →");
    			attr_dev(input0, "id", "order-answers");
    			attr_dev(input0, "type", "checkbox");
    			input0.disabled = input0_disabled_value = /*currentQuestion*/ ctx[2].type === "image";
    			add_location(input0, file$3, 22, 3, 431);
    			attr_dev(label0, "for", "order-answers");
    			attr_dev(label0, "class", "svelte-12mmnxl");
    			add_location(label0, file$3, 25, 4, 562);
    			attr_dev(div0, "class", "checkbox svelte-12mmnxl");
    			add_location(div0, file$3, 21, 2, 405);
    			attr_dev(input1, "id", "hide-missing-cells");
    			attr_dev(input1, "type", "checkbox");
    			input1.disabled = input1_disabled_value = !/*hasMissingAnwers*/ ctx[3];
    			add_location(input1, file$3, 29, 3, 649);
    			attr_dev(label1, "for", "hide-missing-cells");
    			attr_dev(label1, "class", "svelte-12mmnxl");
    			add_location(label1, file$3, 32, 4, 776);
    			attr_dev(div1, "class", "checkbox svelte-12mmnxl");
    			add_location(div1, file$3, 28, 2, 623);
    			attr_dev(div2, "class", "checkboxes");
    			add_location(div2, file$3, 20, 0, 378);
    			attr_dev(span0, "class", "svelte-12mmnxl");
    			add_location(span0, file$3, 37, 41, 909);
    			attr_dev(button0, "class", "svelte-12mmnxl");
    			add_location(button0, file$3, 37, 2, 870);
    			attr_dev(span1, "class", "svelte-12mmnxl");
    			add_location(span1, file$3, 38, 37, 979);
    			attr_dev(button1, "class", "svelte-12mmnxl");
    			add_location(button1, file$3, 38, 2, 944);
    			attr_dev(div3, "class", "buttons");
    			add_location(div3, file$3, 36, 0, 846);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, input0);
    			input0.checked = /*orderAnswers*/ ctx[0];
    			append_dev(div0, t0);
    			append_dev(div0, label0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, input1);
    			input1.checked = /*hideMissingAnswers*/ ctx[1];
    			append_dev(div1, t3);
    			append_dev(div1, label1);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, button0);
    			append_dev(button0, span0);
    			append_dev(button0, t7);
    			append_dev(div3, t8);
    			append_dev(div3, button1);
    			append_dev(button1, span1);
    			append_dev(button1, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[6]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[7]),
    					listen_dev(button0, "click", /*setPreviousQuestion*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*setNextQuestion*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentQuestion*/ 4 && input0_disabled_value !== (input0_disabled_value = /*currentQuestion*/ ctx[2].type === "image")) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty & /*orderAnswers*/ 1) {
    				input0.checked = /*orderAnswers*/ ctx[0];
    			}

    			if (dirty & /*hasMissingAnwers*/ 8 && input1_disabled_value !== (input1_disabled_value = !/*hasMissingAnwers*/ ctx[3])) {
    				prop_dev(input1, "disabled", input1_disabled_value);
    			}

    			if (dirty & /*hideMissingAnswers*/ 2) {
    				input1.checked = /*hideMissingAnswers*/ ctx[1];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Menu", slots, []);
    	let { currentQuestion } = $$props;
    	let { orderAnswers } = $$props;
    	let { hideMissingAnswers } = $$props;
    	let { hasMissingAnwers } = $$props;
    	const dispatch = createEventDispatcher();

    	function setPreviousQuestion() {
    		dispatch("setPreviousQuestion");
    	}

    	function setNextQuestion() {
    		dispatch("setNextQuestion");
    	}

    	const writable_props = ["currentQuestion", "orderAnswers", "hideMissingAnswers", "hasMissingAnwers"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		orderAnswers = this.checked;
    		$$invalidate(0, orderAnswers);
    	}

    	function input1_change_handler() {
    		hideMissingAnswers = this.checked;
    		$$invalidate(1, hideMissingAnswers);
    	}

    	$$self.$$set = $$props => {
    		if ("currentQuestion" in $$props) $$invalidate(2, currentQuestion = $$props.currentQuestion);
    		if ("orderAnswers" in $$props) $$invalidate(0, orderAnswers = $$props.orderAnswers);
    		if ("hideMissingAnswers" in $$props) $$invalidate(1, hideMissingAnswers = $$props.hideMissingAnswers);
    		if ("hasMissingAnwers" in $$props) $$invalidate(3, hasMissingAnwers = $$props.hasMissingAnwers);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		currentQuestion,
    		orderAnswers,
    		hideMissingAnswers,
    		hasMissingAnwers,
    		dispatch,
    		setPreviousQuestion,
    		setNextQuestion
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentQuestion" in $$props) $$invalidate(2, currentQuestion = $$props.currentQuestion);
    		if ("orderAnswers" in $$props) $$invalidate(0, orderAnswers = $$props.orderAnswers);
    		if ("hideMissingAnswers" in $$props) $$invalidate(1, hideMissingAnswers = $$props.hideMissingAnswers);
    		if ("hasMissingAnwers" in $$props) $$invalidate(3, hasMissingAnwers = $$props.hasMissingAnwers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		orderAnswers,
    		hideMissingAnswers,
    		currentQuestion,
    		hasMissingAnwers,
    		setPreviousQuestion,
    		setNextQuestion,
    		input0_change_handler,
    		input1_change_handler
    	];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			currentQuestion: 2,
    			orderAnswers: 0,
    			hideMissingAnswers: 1,
    			hasMissingAnwers: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentQuestion*/ ctx[2] === undefined && !("currentQuestion" in props)) {
    			console.warn("<Menu> was created without expected prop 'currentQuestion'");
    		}

    		if (/*orderAnswers*/ ctx[0] === undefined && !("orderAnswers" in props)) {
    			console.warn("<Menu> was created without expected prop 'orderAnswers'");
    		}

    		if (/*hideMissingAnswers*/ ctx[1] === undefined && !("hideMissingAnswers" in props)) {
    			console.warn("<Menu> was created without expected prop 'hideMissingAnswers'");
    		}

    		if (/*hasMissingAnwers*/ ctx[3] === undefined && !("hasMissingAnwers" in props)) {
    			console.warn("<Menu> was created without expected prop 'hasMissingAnwers'");
    		}
    	}

    	get currentQuestion() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentQuestion(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get orderAnswers() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set orderAnswers(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideMissingAnswers() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideMissingAnswers(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hasMissingAnwers() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hasMissingAnwers(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Grid.svelte generated by Svelte v3.38.3 */
    const file$2 = "src/Grid.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (39:2) {#if answers}
    function create_if_block$2(ctx) {
    	let div;

    	let each_value = /*hideMissingAnswers*/ ctx[2]
    	? /*filteredAnswers*/ ctx[5]
    	: /*answers*/ ctx[3];

    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "grid svelte-up54nm");
    			toggle_class(div, "images", /*currentQuestion*/ ctx[4].type === "image");
    			add_location(div, file$2, 39, 4, 1033);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentParticipantId, hideMissingAnswers, filteredAnswers, answers, currentQuestion, settings*/ 61) {
    				each_value = /*hideMissingAnswers*/ ctx[2]
    				? /*filteredAnswers*/ ctx[5]
    				: /*answers*/ ctx[3];

    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*currentQuestion*/ 16) {
    				toggle_class(div, "images", /*currentQuestion*/ ctx[4].type === "image");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(39:2) {#if answers}",
    		ctx
    	});

    	return block;
    }

    // (51:10) {:else}
    function create_else_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "🤷‍♀️";
    			attr_dev(span, "class", "emoji svelte-up54nm");
    			add_location(span, file$2, 51, 12, 1645);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(51:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (44:10) {#if answer.value}
    function create_if_block_1$2(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentQuestion*/ ctx[4].type === "emoji") return create_if_block_2$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(44:10) {#if answer.value}",
    		ctx
    	});

    	return block;
    }

    // (47:12) {:else}
    function create_else_block$2(ctx) {
    	let img;
    	let img_alt_value;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", img_alt_value = `participant ${/*answer*/ ctx[13].id}'s ${"ddd"}`);
    			if (img.src !== (img_src_value = `${settings.imageFolder}/small/${/*answer*/ ctx[13].formatted}${settings.imageExtension}`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-up54nm");
    			add_location(img, file$2, 47, 14, 1441);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hideMissingAnswers, filteredAnswers, answers*/ 44 && img_alt_value !== (img_alt_value = `participant ${/*answer*/ ctx[13].id}'s ${"ddd"}`)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*hideMissingAnswers, filteredAnswers, answers*/ 44 && img.src !== (img_src_value = `${settings.imageFolder}/small/${/*answer*/ ctx[13].formatted}${settings.imageExtension}`)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(47:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (45:12) {#if currentQuestion.type === 'emoji'}
    function create_if_block_2$2(ctx) {
    	let span;
    	let t_value = /*answer*/ ctx[13].formatted + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text$1(t_value);
    			attr_dev(span, "class", "emoji svelte-up54nm");
    			add_location(span, file$2, 45, 14, 1361);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hideMissingAnswers, filteredAnswers, answers*/ 44 && t_value !== (t_value = /*answer*/ ctx[13].formatted + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(45:12) {#if currentQuestion.type === 'emoji'}",
    		ctx
    	});

    	return block;
    }

    // (42:6) {#each (hideMissingAnswers ? filteredAnswers : answers) as answer, index}
    function create_each_block(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let t2_value = /*answer*/ ctx[13].id + "";
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*answer*/ ctx[13].value) return create_if_block_1$2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*answer*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if_block.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = text$1("#");
    			t2 = text$1(t2_value);
    			t3 = space();
    			attr_dev(div0, "class", "id svelte-up54nm");
    			add_location(div0, file$2, 53, 10, 1704);
    			attr_dev(div1, "class", "answer svelte-up54nm");
    			add_location(div1, file$2, 42, 8, 1196);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if_block.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div1, t3);

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t0);
    				}
    			}

    			if (dirty & /*hideMissingAnswers, filteredAnswers, answers*/ 44 && t2_value !== (t2_value = /*answer*/ ctx[13].id + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(42:6) {#each (hideMissingAnswers ? filteredAnswers : answers) as answer, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let header;
    	let h1;
    	let t1;
    	let h2;
    	let t2_value = /*currentQuestion*/ ctx[4].title + "";
    	let t2;
    	let t3;
    	let menu;
    	let updating_orderAnswers;
    	let updating_hideMissingAnswers;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;

    	function menu_orderAnswers_binding(value) {
    		/*menu_orderAnswers_binding*/ ctx[7](value);
    	}

    	function menu_hideMissingAnswers_binding(value) {
    		/*menu_hideMissingAnswers_binding*/ ctx[8](value);
    	}

    	let menu_props = {
    		hasMissingAnwers: /*filteredAnswers*/ ctx[5].length !== /*answers*/ ctx[3].length,
    		currentQuestion: /*currentQuestion*/ ctx[4]
    	};

    	if (/*orderAnswers*/ ctx[1] !== void 0) {
    		menu_props.orderAnswers = /*orderAnswers*/ ctx[1];
    	}

    	if (/*hideMissingAnswers*/ ctx[2] !== void 0) {
    		menu_props.hideMissingAnswers = /*hideMissingAnswers*/ ctx[2];
    	}

    	menu = new Menu({ props: menu_props, $$inline: true });
    	binding_callbacks.push(() => bind(menu, "orderAnswers", menu_orderAnswers_binding));
    	binding_callbacks.push(() => bind(menu, "hideMissingAnswers", menu_hideMissingAnswers_binding));
    	menu.$on("setPreviousQuestion", /*setPreviousQuestion_handler*/ ctx[9]);
    	menu.$on("setNextQuestion", /*setNextQuestion_handler*/ ctx[10]);
    	let if_block = /*answers*/ ctx[3] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Our 2021 participants";
    			t1 = space();
    			h2 = element("h2");
    			t2 = text$1(t2_value);
    			t3 = space();
    			create_component(menu.$$.fragment);
    			t4 = space();
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "svelte-up54nm");
    			add_location(h1, file$2, 30, 4, 683);
    			attr_dev(h2, "class", "svelte-up54nm");
    			add_location(h2, file$2, 31, 4, 718);
    			attr_dev(header, "class", "svelte-up54nm");
    			add_location(header, file$2, 29, 2, 670);
    			attr_dev(div, "class", "container svelte-up54nm");
    			add_location(div, file$2, 28, 0, 644);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, h2);
    			append_dev(h2, t2);
    			append_dev(header, t3);
    			mount_component(menu, header, null);
    			append_dev(div, t4);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window, "keydown", /*handleKeydown*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*currentQuestion*/ 16) && t2_value !== (t2_value = /*currentQuestion*/ ctx[4].title + "")) set_data_dev(t2, t2_value);
    			const menu_changes = {};
    			if (dirty & /*filteredAnswers, answers*/ 40) menu_changes.hasMissingAnwers = /*filteredAnswers*/ ctx[5].length !== /*answers*/ ctx[3].length;
    			if (dirty & /*currentQuestion*/ 16) menu_changes.currentQuestion = /*currentQuestion*/ ctx[4];

    			if (!updating_orderAnswers && dirty & /*orderAnswers*/ 2) {
    				updating_orderAnswers = true;
    				menu_changes.orderAnswers = /*orderAnswers*/ ctx[1];
    				add_flush_callback(() => updating_orderAnswers = false);
    			}

    			if (!updating_hideMissingAnswers && dirty & /*hideMissingAnswers*/ 4) {
    				updating_hideMissingAnswers = true;
    				menu_changes.hideMissingAnswers = /*hideMissingAnswers*/ ctx[2];
    				add_flush_callback(() => updating_hideMissingAnswers = false);
    			}

    			menu.$set(menu_changes);

    			if (/*answers*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(menu);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let filteredAnswers;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Grid", slots, []);
    	const dispatch = createEventDispatcher();
    	let { answers } = $$props;
    	let { currentQuestion } = $$props;
    	let { currentParticipantId } = $$props;
    	let { orderAnswers } = $$props;
    	let { hideMissingAnswers } = $$props;

    	function handleKeydown(event) {
    		if (event.key === "ArrowLeft") {
    			dispatch("setPreviousQuestion");
    		} else if (event.key === "ArrowRight") {
    			dispatch("setNextQuestion");
    		}
    	}

    	const writable_props = [
    		"answers",
    		"currentQuestion",
    		"currentParticipantId",
    		"orderAnswers",
    		"hideMissingAnswers"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Grid> was created with unknown prop '${key}'`);
    	});

    	function menu_orderAnswers_binding(value) {
    		orderAnswers = value;
    		$$invalidate(1, orderAnswers);
    	}

    	function menu_hideMissingAnswers_binding(value) {
    		hideMissingAnswers = value;
    		$$invalidate(2, hideMissingAnswers);
    	}

    	function setPreviousQuestion_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function setNextQuestion_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler = answer => $$invalidate(0, currentParticipantId = answer.id);

    	$$self.$$set = $$props => {
    		if ("answers" in $$props) $$invalidate(3, answers = $$props.answers);
    		if ("currentQuestion" in $$props) $$invalidate(4, currentQuestion = $$props.currentQuestion);
    		if ("currentParticipantId" in $$props) $$invalidate(0, currentParticipantId = $$props.currentParticipantId);
    		if ("orderAnswers" in $$props) $$invalidate(1, orderAnswers = $$props.orderAnswers);
    		if ("hideMissingAnswers" in $$props) $$invalidate(2, hideMissingAnswers = $$props.hideMissingAnswers);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		settings,
    		Menu,
    		dispatch,
    		answers,
    		currentQuestion,
    		currentParticipantId,
    		orderAnswers,
    		hideMissingAnswers,
    		handleKeydown,
    		filteredAnswers
    	});

    	$$self.$inject_state = $$props => {
    		if ("answers" in $$props) $$invalidate(3, answers = $$props.answers);
    		if ("currentQuestion" in $$props) $$invalidate(4, currentQuestion = $$props.currentQuestion);
    		if ("currentParticipantId" in $$props) $$invalidate(0, currentParticipantId = $$props.currentParticipantId);
    		if ("orderAnswers" in $$props) $$invalidate(1, orderAnswers = $$props.orderAnswers);
    		if ("hideMissingAnswers" in $$props) $$invalidate(2, hideMissingAnswers = $$props.hideMissingAnswers);
    		if ("filteredAnswers" in $$props) $$invalidate(5, filteredAnswers = $$props.filteredAnswers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*answers*/ 8) {
    			$$invalidate(5, filteredAnswers = answers.filter(answer => answer.value));
    		}
    	};

    	return [
    		currentParticipantId,
    		orderAnswers,
    		hideMissingAnswers,
    		answers,
    		currentQuestion,
    		filteredAnswers,
    		handleKeydown,
    		menu_orderAnswers_binding,
    		menu_hideMissingAnswers_binding,
    		setPreviousQuestion_handler,
    		setNextQuestion_handler,
    		click_handler
    	];
    }

    class Grid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			answers: 3,
    			currentQuestion: 4,
    			currentParticipantId: 0,
    			orderAnswers: 1,
    			hideMissingAnswers: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Grid",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*answers*/ ctx[3] === undefined && !("answers" in props)) {
    			console.warn("<Grid> was created without expected prop 'answers'");
    		}

    		if (/*currentQuestion*/ ctx[4] === undefined && !("currentQuestion" in props)) {
    			console.warn("<Grid> was created without expected prop 'currentQuestion'");
    		}

    		if (/*currentParticipantId*/ ctx[0] === undefined && !("currentParticipantId" in props)) {
    			console.warn("<Grid> was created without expected prop 'currentParticipantId'");
    		}

    		if (/*orderAnswers*/ ctx[1] === undefined && !("orderAnswers" in props)) {
    			console.warn("<Grid> was created without expected prop 'orderAnswers'");
    		}

    		if (/*hideMissingAnswers*/ ctx[2] === undefined && !("hideMissingAnswers" in props)) {
    			console.warn("<Grid> was created without expected prop 'hideMissingAnswers'");
    		}
    	}

    	get answers() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answers(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentQuestion() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentQuestion(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentParticipantId() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentParticipantId(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get orderAnswers() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set orderAnswers(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideMissingAnswers() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideMissingAnswers(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ProjectCard.svelte generated by Svelte v3.38.3 */
    const file$1 = "src/ProjectCard.svelte";

    // (23:2) {#if participantHas(participant, '_project_link')}
    function create_if_block_6(ctx) {
    	let a;
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text$1("A link to my project");
    			attr_dev(a, "href", a_href_value = /*participant*/ ctx[0]._project_link);
    			attr_dev(a, "target", "blank");
    			add_location(a, file$1, 23, 4, 608);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && a_href_value !== (a_href_value = /*participant*/ ctx[0]._project_link)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(23:2) {#if participantHas(participant, '_project_link')}",
    		ctx
    	});

    	return block;
    }

    // (33:4) {:else}
    function create_else_block$1(ctx) {
    	let p;
    	let t0;
    	let span;
    	let t1_value = /*participant*/ ctx[0]._housemates.toLowerCase().replace("my", "") + "";
    	let t1;
    	let t2;
    	let t3_value = /*participant*/ ctx[0]._housemates_emoji + "";
    	let t3;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text$1("I live together with my ");
    			span = element("span");
    			t1 = text$1(t1_value);
    			t2 = space();
    			t3 = text$1(t3_value);
    			attr_dev(span, "class", "answer svelte-mrv83g");
    			add_location(span, file$1, 33, 33, 1186);
    			add_location(p, file$1, 33, 6, 1159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, span);
    			append_dev(span, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && t1_value !== (t1_value = /*participant*/ ctx[0]._housemates.toLowerCase().replace("my", "") + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*participant*/ 1 && t3_value !== (t3_value = /*participant*/ ctx[0]._housemates_emoji + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(33:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (31:4) {#if participant._housemates.toLowerCase().includes('alone')}
    function create_if_block_5(ctx) {
    	let p;
    	let span;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span = element("span");
    			span.textContent = "I live by myself";
    			attr_dev(span, "class", "answer svelte-mrv83g");
    			add_location(span, file$1, 31, 9, 1094);
    			add_location(p, file$1, 31, 6, 1091);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(31:4) {#if participant._housemates.toLowerCase().includes('alone')}",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#if participantHas(participant, '_pet')}
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let span;
    	let t1_value = /*participant*/ ctx[0]._pet + "";
    	let t1;
    	let t2;
    	let t3;
    	let t4_value = lib.get(/*participant*/ ctx[0]._pet) + "";
    	let t4;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text$1("I have a ");
    			span = element("span");
    			t1 = text$1(t1_value);
    			t2 = text$1("!");
    			t3 = space();
    			t4 = text$1(t4_value);
    			attr_dev(span, "class", "answer svelte-mrv83g");
    			add_location(span, file$1, 36, 18, 1380);
    			add_location(p, file$1, 36, 6, 1368);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && t1_value !== (t1_value = /*participant*/ ctx[0]._pet + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*participant*/ 1 && t4_value !== (t4_value = lib.get(/*participant*/ ctx[0]._pet) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(36:4) {#if participantHas(participant, '_pet')}",
    		ctx
    	});

    	return block;
    }

    // (41:4) {#if participantHas(participant, '_drawing_neighbourhood')}
    function create_if_block_3(ctx) {
    	let figure;
    	let img;
    	let img_src_value;
    	let t0;
    	let figcaption;

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			img = element("img");
    			t0 = space();
    			figcaption = element("figcaption");
    			figcaption.textContent = "My neighbourhood";
    			if (img.src !== (img_src_value = settings.imageFolder + "/small/_drawing_neighbourhood" + /*participant*/ ctx[0]._id + settings.imageExtension)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Drawing of the neighbourhood");
    			attr_dev(img, "class", "svelte-mrv83g");
    			add_location(img, file$1, 42, 8, 1611);
    			add_location(figcaption, file$1, 43, 8, 1754);
    			attr_dev(figure, "class", "column svelte-mrv83g");
    			add_location(figure, file$1, 41, 6, 1579);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			append_dev(figure, img);
    			append_dev(figure, t0);
    			append_dev(figure, figcaption);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && img.src !== (img_src_value = settings.imageFolder + "/small/_drawing_neighbourhood" + /*participant*/ ctx[0]._id + settings.imageExtension)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(figure);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(41:4) {#if participantHas(participant, '_drawing_neighbourhood')}",
    		ctx
    	});

    	return block;
    }

    // (47:4) {#if participantHas(participant, '_drawing_room')}
    function create_if_block_2$1(ctx) {
    	let figure;
    	let img;
    	let img_src_value;
    	let t0;
    	let figcaption;

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			img = element("img");
    			t0 = space();
    			figcaption = element("figcaption");
    			figcaption.textContent = "My room";
    			if (img.src !== (img_src_value = settings.imageFolder + "/small/_drawing_room" + /*participant*/ ctx[0]._id + settings.imageExtension)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Drawing of the participant's room");
    			attr_dev(img, "class", "svelte-mrv83g");
    			add_location(img, file$1, 48, 8, 1915);
    			add_location(figcaption, file$1, 49, 8, 2054);
    			attr_dev(figure, "class", "column svelte-mrv83g");
    			add_location(figure, file$1, 47, 6, 1883);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			append_dev(figure, img);
    			append_dev(figure, t0);
    			append_dev(figure, figcaption);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && img.src !== (img_src_value = settings.imageFolder + "/small/_drawing_room" + /*participant*/ ctx[0]._id + settings.imageExtension)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(figure);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(47:4) {#if participantHas(participant, '_drawing_room')}",
    		ctx
    	});

    	return block;
    }

    // (53:4) {#if participantHas(participant, '_photo_breakfast')}
    function create_if_block_1$1(ctx) {
    	let figure;
    	let img;
    	let img_src_value;
    	let t0;
    	let figcaption;

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			img = element("img");
    			t0 = space();
    			figcaption = element("figcaption");
    			figcaption.textContent = "My breakfast";
    			if (img.src !== (img_src_value = settings.imageFolder + "/small/_photo_breakfast" + /*participant*/ ctx[0]._id + settings.imageExtension)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Photo of the participant's breakfast");
    			attr_dev(img, "class", "svelte-mrv83g");
    			add_location(img, file$1, 54, 8, 2209);
    			add_location(figcaption, file$1, 55, 8, 2354);
    			attr_dev(figure, "class", "column svelte-mrv83g");
    			add_location(figure, file$1, 53, 6, 2177);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			append_dev(figure, img);
    			append_dev(figure, t0);
    			append_dev(figure, figcaption);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && img.src !== (img_src_value = settings.imageFolder + "/small/_photo_breakfast" + /*participant*/ ctx[0]._id + settings.imageExtension)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(figure);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(53:4) {#if participantHas(participant, '_photo_breakfast')}",
    		ctx
    	});

    	return block;
    }

    // (59:4) {#if participantHas(participant, '_photo_window')}
    function create_if_block$1(ctx) {
    	let figure;
    	let img;
    	let img_src_value;
    	let t0;
    	let figcaption;

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			img = element("img");
    			t0 = space();
    			figcaption = element("figcaption");
    			figcaption.textContent = "My view";
    			if (img.src !== (img_src_value = settings.imageFolder + "/small/_photo_window" + /*participant*/ ctx[0]._id + settings.imageExtension)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Photo out of the participant's window");
    			attr_dev(img, "class", "svelte-mrv83g");
    			add_location(img, file$1, 60, 8, 2511);
    			add_location(figcaption, file$1, 61, 8, 2654);
    			attr_dev(figure, "class", "column svelte-mrv83g");
    			add_location(figure, file$1, 59, 6, 2479);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			append_dev(figure, img);
    			append_dev(figure, t0);
    			append_dev(figure, figcaption);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*participant*/ 1 && img.src !== (img_src_value = settings.imageFolder + "/small/_photo_window" + /*participant*/ ctx[0]._id + settings.imageExtension)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(figure);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(59:4) {#if participantHas(participant, '_photo_window')}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let article;
    	let header;
    	let h1;
    	let t0;
    	let t1_value = /*participant*/ ctx[0]._id + "";
    	let t1;
    	let t2;
    	let show_if_6 = participantHas(/*participant*/ ctx[0], "_project_link");
    	let t3;
    	let section0;
    	let p0;
    	let t4;
    	let span0;
    	let t5_value = /*participant*/ ctx[0]._city + "";
    	let t5;
    	let t6;
    	let p1;
    	let t7;
    	let span1;
    	let t8_value = /*participant*/ ctx[0]._transportation + "";
    	let t8;
    	let t9;
    	let t10_value = /*participant*/ ctx[0]._transportation_emoji + "";
    	let t10;
    	let t11;
    	let p2;
    	let t12;
    	let span2;
    	let t13_value = /*participant*/ ctx[0]._favorite_food + "";
    	let t13;
    	let t14;
    	let show_if_5;
    	let t15;
    	let show_if_4 = participantHas(/*participant*/ ctx[0], "_pet");
    	let t16;
    	let section1;
    	let show_if_3 = participantHas(/*participant*/ ctx[0], "_drawing_neighbourhood");
    	let t17;
    	let show_if_2 = participantHas(/*participant*/ ctx[0], "_drawing_room");
    	let t18;
    	let show_if_1 = participantHas(/*participant*/ ctx[0], "_photo_breakfast");
    	let t19;
    	let show_if = participantHas(/*participant*/ ctx[0], "_photo_window");
    	let mounted;
    	let dispose;
    	let if_block0 = show_if_6 && create_if_block_6(ctx);

    	function select_block_type(ctx, dirty) {
    		if (show_if_5 == null || dirty & /*participant*/ 1) show_if_5 = !!/*participant*/ ctx[0]._housemates.toLowerCase().includes("alone");
    		if (show_if_5) return create_if_block_5;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = show_if_4 && create_if_block_4(ctx);
    	let if_block3 = show_if_3 && create_if_block_3(ctx);
    	let if_block4 = show_if_2 && create_if_block_2$1(ctx);
    	let if_block5 = show_if_1 && create_if_block_1$1(ctx);
    	let if_block6 = show_if && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			article = element("article");
    			header = element("header");
    			h1 = element("h1");
    			t0 = text$1("Participant #");
    			t1 = text$1(t1_value);
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			section0 = element("section");
    			p0 = element("p");
    			t4 = text$1("I live in ");
    			span0 = element("span");
    			t5 = text$1(t5_value);
    			t6 = space();
    			p1 = element("p");
    			t7 = text$1("My main mode of transportation is ");
    			span1 = element("span");
    			t8 = text$1(t8_value);
    			t9 = space();
    			t10 = text$1(t10_value);
    			t11 = space();
    			p2 = element("p");
    			t12 = text$1("My favorite food is ");
    			span2 = element("span");
    			t13 = text$1(t13_value);
    			t14 = space();
    			if_block1.c();
    			t15 = space();
    			if (if_block2) if_block2.c();
    			t16 = space();
    			section1 = element("section");
    			if (if_block3) if_block3.c();
    			t17 = space();
    			if (if_block4) if_block4.c();
    			t18 = space();
    			if (if_block5) if_block5.c();
    			t19 = space();
    			if (if_block6) if_block6.c();
    			add_location(h1, file$1, 21, 2, 511);
    			attr_dev(header, "class", "header svelte-mrv83g");
    			add_location(header, file$1, 20, 2, 485);
    			attr_dev(span0, "class", "answer svelte-mrv83g");
    			add_location(span0, file$1, 27, 17, 746);
    			add_location(p0, file$1, 27, 4, 733);
    			attr_dev(span1, "class", "answer svelte-mrv83g");
    			add_location(span1, file$1, 28, 41, 837);
    			add_location(p1, file$1, 28, 4, 800);
    			attr_dev(span2, "class", "answer svelte-mrv83g");
    			add_location(span2, file$1, 29, 27, 960);
    			add_location(p2, file$1, 29, 4, 937);
    			attr_dev(section0, "class", "info svelte-mrv83g");
    			add_location(section0, file$1, 26, 2, 706);
    			attr_dev(section1, "class", "images svelte-mrv83g");
    			add_location(section1, file$1, 39, 2, 1484);
    			attr_dev(article, "class", "card-container svelte-mrv83g");
    			add_location(article, file$1, 19, 0, 427);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, header);
    			append_dev(header, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(header, t2);
    			if (if_block0) if_block0.m(header, null);
    			append_dev(article, t3);
    			append_dev(article, section0);
    			append_dev(section0, p0);
    			append_dev(p0, t4);
    			append_dev(p0, span0);
    			append_dev(span0, t5);
    			append_dev(section0, t6);
    			append_dev(section0, p1);
    			append_dev(p1, t7);
    			append_dev(p1, span1);
    			append_dev(span1, t8);
    			append_dev(p1, t9);
    			append_dev(p1, t10);
    			append_dev(section0, t11);
    			append_dev(section0, p2);
    			append_dev(p2, t12);
    			append_dev(p2, span2);
    			append_dev(span2, t13);
    			append_dev(section0, t14);
    			if_block1.m(section0, null);
    			append_dev(section0, t15);
    			if (if_block2) if_block2.m(section0, null);
    			append_dev(article, t16);
    			append_dev(article, section1);
    			if (if_block3) if_block3.m(section1, null);
    			append_dev(section1, t17);
    			if (if_block4) if_block4.m(section1, null);
    			append_dev(section1, t18);
    			if (if_block5) if_block5.m(section1, null);
    			append_dev(section1, t19);
    			if (if_block6) if_block6.m(section1, null);

    			if (!mounted) {
    				dispose = listen_dev(article, "click", /*handleClick*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*participant*/ 1 && t1_value !== (t1_value = /*participant*/ ctx[0]._id + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*participant*/ 1) show_if_6 = participantHas(/*participant*/ ctx[0], "_project_link");

    			if (show_if_6) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(header, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*participant*/ 1 && t5_value !== (t5_value = /*participant*/ ctx[0]._city + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*participant*/ 1 && t8_value !== (t8_value = /*participant*/ ctx[0]._transportation + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*participant*/ 1 && t10_value !== (t10_value = /*participant*/ ctx[0]._transportation_emoji + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*participant*/ 1 && t13_value !== (t13_value = /*participant*/ ctx[0]._favorite_food + "")) set_data_dev(t13, t13_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(section0, t15);
    				}
    			}

    			if (dirty & /*participant*/ 1) show_if_4 = participantHas(/*participant*/ ctx[0], "_pet");

    			if (show_if_4) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					if_block2.m(section0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*participant*/ 1) show_if_3 = participantHas(/*participant*/ ctx[0], "_drawing_neighbourhood");

    			if (show_if_3) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					if_block3.m(section1, t17);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*participant*/ 1) show_if_2 = participantHas(/*participant*/ ctx[0], "_drawing_room");

    			if (show_if_2) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2$1(ctx);
    					if_block4.c();
    					if_block4.m(section1, t18);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (dirty & /*participant*/ 1) show_if_1 = participantHas(/*participant*/ ctx[0], "_photo_breakfast");

    			if (show_if_1) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_1$1(ctx);
    					if_block5.c();
    					if_block5.m(section1, t19);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty & /*participant*/ 1) show_if = participantHas(/*participant*/ ctx[0], "_photo_window");

    			if (show_if) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block$1(ctx);
    					if_block6.c();
    					if_block6.m(section1, null);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function participantHas(part, prop) {
    	// console.log(part, part[prop])
    	return part[prop] !== "";
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ProjectCard", slots, []);
    	let { participant } = $$props;
    	const dispatch = createEventDispatcher();

    	function handleClick() {
    		dispatch("flip", { id: participant._id });
    	}

    	const writable_props = ["participant"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProjectCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("participant" in $$props) $$invalidate(0, participant = $$props.participant);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		s: settings,
    		emojiGet: lib.get,
    		participant,
    		dispatch,
    		participantHas,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("participant" in $$props) $$invalidate(0, participant = $$props.participant);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [participant, handleClick];
    }

    class ProjectCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { participant: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectCard",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*participant*/ ctx[0] === undefined && !("participant" in props)) {
    			console.warn("<ProjectCard> was created without expected prop 'participant'");
    		}
    	}

    	get participant() {
    		throw new Error("<ProjectCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set participant(value) {
    		throw new Error("<ProjectCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const questions = [
      {
        name: 'country',
        title: 'The countries they live in',
        column: '_cat_country',
        type: 'emoji'
      },
      {
        name: 'transportation',
        title: 'Their main means of transportation',
        column: '_transportation_emoji',
        type: 'emoji'
      },
      {
        name: 'room drawing',
        title: 'What their room looks like',
        column: '_drawing_room',
        type: 'image'
      },
      {
        name: 'neighbourhood drawing',
        title: 'What their neighbourhood looks like',
        column: '_drawing_neighbourhood',
        type: 'image'
      },
      {
        name: 'window picture',
        title: 'What they see when they look out the window',
        column: '_photo_window',
        type: 'image'
      },
      {
        name: 'breakfast picture',
        title: 'What their breakfast looks like',
        column: '_photo_breakfast',
        type: 'image'
      }
    ];

    /* src/App.svelte generated by Svelte v3.38.3 */
    const file = "src/App.svelte";

    // (106:1) {:else}
    function create_else_block(ctx) {
    	let div;
    	let div_transition;
    	let current;
    	let if_block = /*currentParticipant*/ ctx[5] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "side svelte-8vmaq3");
    			add_location(div, file, 106, 2, 2683);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*currentParticipant*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*currentParticipant*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, flip, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, flip, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(106:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (90:1) {#if currentParticipantId == null}
    function create_if_block(ctx) {
    	let div;
    	let div_transition;
    	let current;
    	let if_block = /*participants*/ ctx[0].length > 0 && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "side svelte-8vmaq3");
    			add_location(div, file, 90, 2, 2267);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*participants*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*participants*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, flip, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, flip, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(90:1) {#if currentParticipantId == null}",
    		ctx
    	});

    	return block;
    }

    // (108:3) {#if currentParticipant}
    function create_if_block_2(ctx) {
    	let projectcard;
    	let current;

    	projectcard = new ProjectCard({
    			props: {
    				participant: /*currentParticipant*/ ctx[5]
    			},
    			$$inline: true
    		});

    	projectcard.$on("flip", /*flip_handler*/ ctx[13]);

    	const block = {
    		c: function create() {
    			create_component(projectcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(projectcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const projectcard_changes = {};
    			if (dirty & /*currentParticipant*/ 32) projectcard_changes.participant = /*currentParticipant*/ ctx[5];
    			projectcard.$set(projectcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projectcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projectcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(projectcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(108:3) {#if currentParticipant}",
    		ctx
    	});

    	return block;
    }

    // (92:3) {#if participants.length > 0}
    function create_if_block_1(ctx) {
    	let grid;
    	let updating_currentParticipantId;
    	let updating_orderAnswers;
    	let updating_hideMissingAnswers;
    	let current;

    	function grid_currentParticipantId_binding(value) {
    		/*grid_currentParticipantId_binding*/ ctx[10](value);
    	}

    	function grid_orderAnswers_binding(value) {
    		/*grid_orderAnswers_binding*/ ctx[11](value);
    	}

    	function grid_hideMissingAnswers_binding(value) {
    		/*grid_hideMissingAnswers_binding*/ ctx[12](value);
    	}

    	let grid_props = {
    		answers: /*answers*/ ctx[6],
    		currentQuestion: /*currentQuestion*/ ctx[3]
    	};

    	if (/*currentParticipantId*/ ctx[1] !== void 0) {
    		grid_props.currentParticipantId = /*currentParticipantId*/ ctx[1];
    	}

    	if (/*orderAnswers*/ ctx[2] !== void 0) {
    		grid_props.orderAnswers = /*orderAnswers*/ ctx[2];
    	}

    	if (/*hideMissingAnswers*/ ctx[4] !== void 0) {
    		grid_props.hideMissingAnswers = /*hideMissingAnswers*/ ctx[4];
    	}

    	grid = new Grid({ props: grid_props, $$inline: true });
    	binding_callbacks.push(() => bind(grid, "currentParticipantId", grid_currentParticipantId_binding));
    	binding_callbacks.push(() => bind(grid, "orderAnswers", grid_orderAnswers_binding));
    	binding_callbacks.push(() => bind(grid, "hideMissingAnswers", grid_hideMissingAnswers_binding));
    	grid.$on("setPreviousQuestion", /*setPreviousQuestion*/ ctx[7]);
    	grid.$on("setNextQuestion", /*setNextQuestion*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const grid_changes = {};
    			if (dirty & /*answers*/ 64) grid_changes.answers = /*answers*/ ctx[6];
    			if (dirty & /*currentQuestion*/ 8) grid_changes.currentQuestion = /*currentQuestion*/ ctx[3];

    			if (!updating_currentParticipantId && dirty & /*currentParticipantId*/ 2) {
    				updating_currentParticipantId = true;
    				grid_changes.currentParticipantId = /*currentParticipantId*/ ctx[1];
    				add_flush_callback(() => updating_currentParticipantId = false);
    			}

    			if (!updating_orderAnswers && dirty & /*orderAnswers*/ 4) {
    				updating_orderAnswers = true;
    				grid_changes.orderAnswers = /*orderAnswers*/ ctx[2];
    				add_flush_callback(() => updating_orderAnswers = false);
    			}

    			if (!updating_hideMissingAnswers && dirty & /*hideMissingAnswers*/ 16) {
    				updating_hideMissingAnswers = true;
    				grid_changes.hideMissingAnswers = /*hideMissingAnswers*/ ctx[4];
    				add_flush_callback(() => updating_hideMissingAnswers = false);
    			}

    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(92:3) {#if participants.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentParticipantId*/ ctx[1] == null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "container svelte-8vmaq3");
    			add_location(div, file, 88, 0, 2205);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function flip(node, { delay = 0, duration = 250 }) {
    	return {
    		delay,
    		duration,
    		css: (t, u) => `
				transform: rotateY(${1 - u * 180}deg);
				opacity: ${0.8 - u};
			`
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let currentParticipant;
    	let currentQuestion;
    	let answers;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let participants = [];
    	let currentParticipantId = null;
    	let orderAnswers = true;
    	let hideMissingAnswers = true;
    	let currentQuestionIndex = 0;

    	function setPreviousQuestion() {
    		$$invalidate(9, currentQuestionIndex = (currentQuestionIndex - 1 + questions.length) % questions.length);
    	}

    	function setNextQuestion() {
    		$$invalidate(9, currentQuestionIndex = (currentQuestionIndex + 1) % questions.length);
    	}

    	function formatValue(row, column) {
    		let value = row[column];

    		if (column === "_cat_country") {
    			if (value === "united states") {
    				value = "us";
    			}

    			return lib.get(value) ? lib.get(value) : "";
    		} else if (column === "_transportation_emoji") {
    			// Note: because emoji's consist of multiple chars a simple emoji[0] doesn't work here
    			return [...value][0];
    		} else {
    			return column + row._id;
    		}
    	}

    	function extractAnswers(participants, column, options) {
    		let answers = [...participants].map(row => ({
    			id: parseInt(row._id),
    			value: row[column],
    			formatted: formatValue(row, column)
    		}));

    		if (options.orderAnswers && options.currentQuestionType !== "image") {
    			answers = answers.sort((rowA, rowB) => rowA.value.localeCompare(rowB.value));
    		}

    		return answers;
    	}

    	// Load the word data and set variables
    	onMount(async () => {
    		$$invalidate(0, participants = await csv("assets/data/survey.csv"));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function grid_currentParticipantId_binding(value) {
    		currentParticipantId = value;
    		$$invalidate(1, currentParticipantId);
    	}

    	function grid_orderAnswers_binding(value) {
    		orderAnswers = value;
    		$$invalidate(2, orderAnswers);
    	}

    	function grid_hideMissingAnswers_binding(value) {
    		hideMissingAnswers = value;
    		$$invalidate(4, hideMissingAnswers);
    	}

    	const flip_handler = () => $$invalidate(1, currentParticipantId = null);

    	$$self.$capture_state = () => ({
    		onMount,
    		csv,
    		nameMap,
    		Grid,
    		ProjectCard,
    		questions,
    		participants,
    		currentParticipantId,
    		orderAnswers,
    		hideMissingAnswers,
    		currentQuestionIndex,
    		setPreviousQuestion,
    		setNextQuestion,
    		formatValue,
    		extractAnswers,
    		flip,
    		currentParticipant,
    		currentQuestion,
    		answers
    	});

    	$$self.$inject_state = $$props => {
    		if ("participants" in $$props) $$invalidate(0, participants = $$props.participants);
    		if ("currentParticipantId" in $$props) $$invalidate(1, currentParticipantId = $$props.currentParticipantId);
    		if ("orderAnswers" in $$props) $$invalidate(2, orderAnswers = $$props.orderAnswers);
    		if ("hideMissingAnswers" in $$props) $$invalidate(4, hideMissingAnswers = $$props.hideMissingAnswers);
    		if ("currentQuestionIndex" in $$props) $$invalidate(9, currentQuestionIndex = $$props.currentQuestionIndex);
    		if ("currentParticipant" in $$props) $$invalidate(5, currentParticipant = $$props.currentParticipant);
    		if ("currentQuestion" in $$props) $$invalidate(3, currentQuestion = $$props.currentQuestion);
    		if ("answers" in $$props) $$invalidate(6, answers = $$props.answers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentParticipantId, participants*/ 3) {
    			$$invalidate(5, currentParticipant = currentParticipantId !== null
    			? participants[currentParticipantId]
    			: undefined);
    		}

    		if ($$self.$$.dirty & /*currentQuestionIndex*/ 512) {
    			$$invalidate(3, currentQuestion = questions[currentQuestionIndex]);
    		}

    		if ($$self.$$.dirty & /*participants, currentQuestion, orderAnswers*/ 13) {
    			$$invalidate(6, answers = extractAnswers(participants, currentQuestion.column, {
    				orderAnswers,
    				currentQuestionType: currentQuestion.type
    			}));
    		}
    	};

    	return [
    		participants,
    		currentParticipantId,
    		orderAnswers,
    		currentQuestion,
    		hideMissingAnswers,
    		currentParticipant,
    		answers,
    		setPreviousQuestion,
    		setNextQuestion,
    		currentQuestionIndex,
    		grid_currentParticipantId_binding,
    		grid_orderAnswers_binding,
    		grid_hideMissingAnswers_binding,
    		flip_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
