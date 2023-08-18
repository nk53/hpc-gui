class PBSOpts {
    initialized = null;

    /**
     * for the common case were an option is something like:
     *   -opt "value"
     */
    single_opts = {
        'account': '-A',
        'name': '-N',
        'queue': '-q',
        'walltime': '-w',
    };

    /**
     * maps option name to a function wrapped template string taking the
     * option value and returning the option text
     */
    templates = {
        'pcput': value => `-l pcput=${value}`,
    };

    /**
     * maps option name to function taking a list of jQuery objects and
     * returning the option text OR an array of option texts
     */
    updaters = {
        'chunk': function(elems) {
            if (!this.initialized) {
                var system = jq_name('system');
                var chunk_attrs = new Set();

                elems.each(
                    (idx, e) => chunk_attrs.add(nth_key(e.name, 2))
                );
            }

            let n_sets = elems.filter('[name*=nchunks]').length;
            let chunks = [];
            for (let i = 1; i < n_sets; ++i) { // 0th chunk is template
                let chunk = [];

                let prefix = `PBS[chunk][${i}]`;
                for (let attr of chunk_attrs) {
                    const name = sel_name(`${prefix}[${attr}]`, '^=');
                    let element = elems.filter(name);

                    let value;
                    if (attr == 'mem')
                        value = PBSOpts.get_mem_size(element);
                    else
                        value = element.val();

                    if (value && value !== '0') {
                        if (attr == 'nchunks' && value > 1)
                            chunk.push(value);
                        else if (attr != 'nchunks')
                            chunk.push(`${attr}=${value}`);
                    }
                }
                if (system.val() != 'any')
                    chunk.push(`system=${system.val()}`);
                chunks.push(chunk.join(':'));
            }
            chunks = chunks.join('+');
            if (chunks)
                return `#PBS -l select=${chunks}`;
        },
        'mail': function(elems) {
            if (!this.initialized) {
                var addr = elems.filter(sel_name('addr', '*='));
                var use = elems.filter(sel_name('use', '*='))[0];
                // map letters to corresponding DOM elements
                var letters = {};
                for (const c of 'abej') {
                    const m_name = sel_name(`PBS[mail][${c}]`);
                    letters[c] = elems.filter(m_name)[0];
                }
            }

            if (!use.checked)
                return null;

            let M_opt = addr.val();
            let m_opt = $.map(letters, (elem, c) => (elem.checked) ? c : '')
                         .reduce((accum, item) => accum + item);

            let result = [];
            if (addr.val().length)
                result.push(`#PBS -M "${M_opt}"`);

            if (m_opt)
                result.push(`#PBS -m ${m_opt}`);

            return result;
        },
        'place': function(elems) {
            if (!this.initialized) {
                var arrangement = elems.filter(sel_name('arrangement', '*='));
                var sharing = elems.filter(sel_name('sharing', '*='));
            }

            let a_opt = arrangement.val();
            let s_opt = sharing.val();

            return `#PBS -l place=${a_opt}:${s_opt}`;
        },
        'pmem': this.update_memory,
        'pvmem': this.update_memory,
    };

    constructor(pbs_text_elem=null, pbs_elems=null) {
        if (pbs_elems === null)
            this.pbs_elems = jq_name('PBS', '^=');
        else
            this.pbs_elems = pbs_elems;

        if (pbs_text_elem === null)
            this.pbs_text_elem = jq_id('pbs_opts');
        else
            this.pbs_text_elem = $(pbs_text_elem);

        this.pbs_lines = {};
        this.watch_elems(this.pbs_elems);
        this.set_pbs_text();
    }

    append_chunk(elems) {
        // filter elems to only those whose name
        // starts with PBS (including descendants)
        const sel = "[name^=PBS]";
        const new_elems = elems.find(sel).add(elems.filter(sel));
        this.pbs_elems = this.pbs_elems.add(new_elems);
        this.watch_elems(new_elems);
        this.set_pbs_text();
    }

    /**
     * given a jQuery object representing a set of elements belonging to
     * a single memory size widget, returns the memory size as a string like
     * '4gb' or '2kb'
     */
    static get_mem_size(elems) {
        const num = elems.filter(sel_id('[num]', '$=')).val();

        if (!num || num === '0')
            return null;

        const scale = elems.filter(':checked').val();
        const value = `${num}${scale.toLowerCase()}`;

        return value;
    }

    remove_chunk(chunk_num) {
        const to_remove = jq_name(`[chunk][${chunk_num}]`, '*=');
        this.pbs_elems = this.pbs_elems.not(to_remove);
        jq_name('[chunk][0][nchunks]', '*=').trigger('change');
    }

    set_pbs_text() {
        const lines = [...Object.values(this.pbs_lines)];
        const new_text = lines.join("\n");
        this.pbs_text_elem.text(new_text);
        update_code();
    }

    update_memory(elems) {
        const key = first_key(elems[0].name);
        const value = PBSOpts.get_mem_size(elems);

        if (!value)
            return null;

        return `#PBS -l ${key}=${value}`;
    }

    /**
     * N.B. jQuery overrides the `this` keyword to reference the event's target
     * DOM element. Use `event.data.obj` instead.
     */
    update(event) {
        const obj = event.data.obj;
        const key = first_key(this.name);

        if (Object.hasOwn(obj.single_opts, key)) {
            // simplest case
            let value = $(this).val();
            if (value === "") {
                delete obj.pbs_lines[key];
            } else {
                const flag = obj.single_opts[key];
                value = `#PBS ${flag} "${value}"`;
                obj.pbs_lines[key] = value;
            }
        } else if (Object.hasOwn(obj.templates, key)) {
            let value = $(this).val();
            if (value === "") {
                delete obj.pbs_lines[key];
            } else {
                value = obj.templates[key](value);
                obj.pbs_lines[key] = `#PBS ${value}`;
            }
        } else if (Object.hasOwn(obj.updaters, key)) {
            const elem_group = jq_name(`PBS[${key}]`, '^=');
            let value = obj.updaters[key](elem_group);

            if (Array.isArray(value))
                value = value.join("\n");

            if ([null, undefined, ""].includes(value))
                delete obj.pbs_lines[key];
            else
                obj.pbs_lines[key] = value;
        } else {
            console.log(`missing updater for '${key}'`);
        }

        if (obj.initialized) // avoids spamming this function on page load
            obj.set_pbs_text();
    }

    watch_elems(elems) {
        this.initialized = false;

        // cf. https://api.jquery.com/on/#on-events-selector-data-handler
        elems.on('change',
            null,        // use event handler for all elems in pbs_elems
            {obj: this}, // data to store in event.data
            this.update  // event handler
        );
        elems.trigger('change');

        this.initialized = true;
    }
}

/**
 * given a string that looks like `some[text][with][brackets]`, return the
 * part inside the first set of square brackets `[]`
 */
function nth_key(str, n=0) {
    const subscript_re = /\[([^\]]*)\]/g; // match text inside these: []

    // each match looks like ["[text]", "text"], so matches[0][1] gets the
    // first subscript, not including brackets
    const matches = [...str.matchAll(subscript_re)];
    const key = matches[n][1];

    return key;
}

function first_key(str) {
    return nth_key(str);
}

/**
 * Shortcuts to select jQuery elements by name or other attribute
 */
// return jQuery object with name selector; for name-only selections
function jq_name(sel, rel='=') {
    return $(sel_name(sel, rel));
}

// return an name selector; for use in compound selections
function sel_name(sel, rel='=') {
    return `#${active_page} [name${rel}"${sel}"]`;
}

// return a jQuery object selected by a single attribute
function jq_attr(attr, sel, rel='=') {
    return $(sel_attr(attr, sel, rel));
}

// like above, but handles IDs that are unique across all pages
function sel_id(id, rel='=') {
    if (['=', '^='].includes(rel))
        return `[id${rel}"${active_page}_${id}"]`;
    return `[id${rel}"${id}"]`;
}

function jq_id(id, rel='=') {
    return $(sel_id(id, rel));
}

function jq_label(for_id, rel='=') {
    return $(sel_label(for_id, rel));
}

function sel_label(for_id, rel='=') {
    return `label[for${rel}"${active_page}_${for_id}"]`;
}

// return an attribute selection
function sel_attr(attr, sel, rel='=') {
    return `#${active_page} [${attr}${rel}"${sel}"]`;
}

/**
 *  Callback functions should take 2 args:
 *      target  the element to update
 *      src     the form input whose value is used for updating
 */
function num_to_range_list(target, src) {
    let from = $(target).attr('data-range-start');
    if (!from)
        from = 0;

    const len = Number.parseInt( src.val() ) - from;

    let nums = Array(len);
    for (let i = 0; i < len; ++i)
        nums[i] = from++;

    target.html(nums.join(','));
}

function update_code() {
    jq_name('code').val( jq_id('script_tpl').text() );
}

function toggle_email(assign_page) {
    var assigned_page = assign_page;
    if (!assign_page)
        console.log('Missing page assignment for toggle_email()');

    let box_sel = `#${assigned_page} [name='PBS[mail][use]']`;
    var box = $(box_sel);
    var email_opts = $(`#${assigned_page} .email-options`);

    if (!box.length)
        console.log(`Missing box: ${box_sel}`);

    box = box[0];

    return function() {
        if (box.checked)
            email_opts.show();
        else
            email_opts.hide();
    }
}

var active_page = null;
var loaded_pages = [];
function setup_form(event, ui) {
    active_page = ui.toPage[0].id;

    if (loaded_pages.includes(active_page))
        return;

    if (['home', '404'].includes(active_page))
        return;

    var pbs_obj;

    // data-src elements get their contents from form values
    $(`#${active_page} [data-src]:not([data-function])`).each(function() {
        // element to update
        const target = $(this);
        // form input whose value is used for updating
        const src = jq_name(target.attr('data-src'));

        // put input's value directly in target
        function updater() {
            target.html( src.val() );
            update_code();
        }

        src.change(updater);

        // also do it now
        updater();
    });

    $(`#${active_page} [data-function]`).each(function() {
        const target = $(this);
        const callback = eval(target.attr('data-function'));
        const src_name = target.attr('data-src');

        if (src_name === null)
            return; // not sure what to do here yet

        const src = jq_name(src_name);

        // on input change, use callback function
        function updater() {
            callback(target, src);
            update_code();
        }

        src.change(updater);
        updater();
    });

    var email_toggle = toggle_email(active_page);
    jq_name('PBS[mail][use]').change(email_toggle);
    email_toggle();

    var chunk_add_btn = jq_id('chunk_tpl_add');
    var chunk_rm_btn = jq_id('chunk_tpl_rm');
    var chunk_num_sets = 0;

    function chunk_add_func() {
        ++chunk_num_sets;
        let cnsb = `[${chunk_num_sets}]`; // cnsb = chunk_num_sets with brackets

        // make a copy of the template
        let tpl = jq_id("chunk_tpl");
        let new_set = tpl.clone();
        // change all [0] -> [nchunks]
        new_set.find(sel_id('[0]', '*=')).each(function() {
            this.id = this.id.replace('[0]', cnsb);
            let new_name = $(this).attr('name');
            if (new_name !== undefined)
                new_name = new_name.replace('[0]', cnsb);
            $(this).attr('name', new_name);
        });
        new_set.find('[for*="[0]"]').each(function() {
            let new_for = $(this).attr('for').replace('[0]', cnsb);
            $(this).attr('for', new_for);
        });
        // set the chunk set's label
        new_set.find('span').text(chunk_num_sets);

        // allow jqm enhancements
        new_set.find('[data-enhanced]').each(function() {
            $(this).removeAttr('data-enhanced');
        });

        // append copy to this section
        new_set.attr('id', `${active_page}_chunk_${chunk_num_sets}`);
        new_set.appendTo(tpl.parent());
        new_set.show();

        // jqm needs to be told to apply UI enhancements
        new_set.enhanceWithin();

        // PBSOpts needs to be told to watch new elements
        pbs_obj.append_chunk(new_set);

        chunk_rm_btn.show();
    }

    function chunk_rm_func() {
        if (!chunk_num_sets)
            return;

        jq_id(`chunk_${chunk_num_sets}`).remove();
        pbs_obj.remove_chunk(chunk_num_sets);
        --chunk_num_sets;

        if (!chunk_num_sets)
            chunk_rm_btn.hide();
    }

    chunk_rm_btn.on('click', chunk_rm_func);
    chunk_add_btn.on('click', chunk_add_func);

    chunk_rm_btn.hide();
    jq_id('chunk_tpl').hide();

    pbs_obj = new PBSOpts();

    // autofill chunks if a default has been set
    const default_chunks = jq_id('default_chunks').val();
    const memory_opts = ['mem'];  // TODO: support more chunk-level memory opts?
    const mem_size_re = /([0-9])+([^0-9]+)/g;
    const mem_size_map = {'gb': 'GB', 'mb': 'MB', 'kb': 'kB'};
    if (default_chunks) {
        const chunk_sets = default_chunks.split('+');
        for (let chunk of chunk_sets) {
            chunk_add_func();

            let opts = chunk.split(':');
            if (!opts[0].includes('='))
                jq_id(`PBS[chunk][${chunk_num_sets}][nchunks]`).val(opts.shift());

            for (let opt of opts) {
                const [name, value] = opt.split('=');
                const prefix = `PBS[chunk][${chunk_num_sets}][${name}]`;
                if (memory_opts.includes(name)) {
                    let num, scale;
                    try {
                        [, num, scale] = [...value.matchAll(mem_size_re)][0];
                    } catch (error) {
                        console.log(`Invalid memory size option: ${opt}`);
                        console.error(error);
                        continue;
                    }

                    if (Object.keys(mem_size_map).includes(scale))
                        scale = mem_size_map[scale];

                    jq_id(`${prefix}[num]`).val(num);
                    jq_label(`${prefix}[scale]-${scale}`).click();
                } else {
                    jq_id(prefix).val(value);
                }
            }
        }
    }

    // <textarea> elems only auto-adjust their size on keyup, not on change
    $(`#${active_page} textarea`).trigger('keyup');

    loaded_pages.push(active_page);
    console.log(active_page);
}

$(document).on('pageload', function(event, ui) {
    active_page = ui.toPage[0].id;
    let index = loaded_pages.indexOf(active_page);
    if (index !== -1)
        loaded_pages.splice(index, 1); // remove it to allow re-loading
});
$(document).on('pagecontainerchange', setup_form);
