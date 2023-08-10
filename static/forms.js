/**
 * TODO: pagehide event does NOT do what I thought. Instead, it inserts a new
 * <div data-role="page"> and hides the old page <div>, without destroying it.
 *
 * That means proper event handler updates should not necessarily delete the
 * old handlers. Also, all form event handlers should perform selections
 * relative to the page <div>.
 *
 * IDs are currently fucked in this scheme, since I assumed the cached pages
 * would not actually remain in the DOM. So either jqm caching should be
 * disabled OR all generated IDs must be guaranteed to be unique across pages.
 * The simplest way to accomplish this might be to insert _{{ page }} in all
 * generated IDs.
 */

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
            this.pbs_elems = $('[name^=PBS]');
        else
            this.pbs_elems = pbs_elems;

        if (pbs_text_elem === null)
            this.pbs_text_elem = $('#pbs_opts');
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

    clear() {
        this.pbs_elems.off();
    }

    /**
     * given a jQuery object representing a set of elements belonging to
     * a single memory size widget, returns the memory size as a string like
     * '4gb' or '2kb'
     */
    static get_mem_size(elems) {
        const num = elems.filter('[id$="[num]"]').val();

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
     * DOM element. Use `event_obj.data.obj` instead.
     */
    update(event_obj) {
        const obj = event_obj.data.obj;
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
            {obj: this}, // data to store in event_obj.data
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
    return `[name${rel}"${sel}"]`;
}

// return a jQuery object selected by a single attribute
function jq_attr(attr, sel, rel='=') {
    return $(sel_attr(attr, sel, rel));
}

// return an attribute selection
function sel_attr(attr, sel, rel='=') {
    return `[${attr}${rel}"${sel}"]`;
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
    $('[name=code]').val( $('#script_tpl').text() );
}

function toggle_email() {
    let box = jq_name('PBS[mail][use]');
    if (box.length) {
        box = box[0];
        let email_opts = $('.email-options');
        if (box.checked)
            email_opts.show();
        else
            email_opts.hide();
    }
}

var event_handlers = [];
var pbs_obj = null;
function setup_form() {
    // remove any pre-existing event handlers set by this function
    for (let i = 0; i < event_handlers.length; ++i) {
        let src = event_handlers[0];
        let updater = event_handlers[1];
        $(src).off(updater);
    }

    if (pbs_obj !== null)
        pbs_obj.clear();

    // data-src elements get their contents from form values
    $("[data-src]:not([data-function])").each(function() {
        // element to update
        const target = $(this);
        // form input whose value is used for updating
        const src = $(`[name=${target.attr('data-src')}]`);

        // put input's value directly in target
        function updater() {
            target.html( src.val() );
            update_code();
        }

        src.change(updater);

        // also do it now
        updater();

        event_handlers.push([src, updater]);
    });

    $("[data-function]").each(function() {
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
        event_handlers.push([src, updater]);
    });

    jq_name('PBS[mail][use]').change(toggle_email);
    toggle_email();

    var chunk_add_btn = $('#chunk_tpl_add');
    var chunk_rm_btn = $('#chunk_tpl_rm');
    var chunk_num_sets = 0;
    chunk_add_btn.on('click', function() {
        ++chunk_num_sets;
        let nsb = `[${chunk_num_sets}]`; // nsb = chunk_num_sets with brackets

        // make a copy of the template
        let tpl = $("#chunk_tpl");
        let new_set = tpl.clone();
        // change all [0] -> [nchunks]
        new_set.find('[id*="[0]"]').each(function() {
            this.id = this.id.replace('[0]', nsb);
            let new_name = $(this).attr('name');
            if (new_name !== undefined)
                new_name = new_name.replace('[0]', nsb);
            $(this).attr('name', new_name);
        });
        new_set.find('[for*="[0]"]').each(function() {
            let new_for = $(this).attr('for').replace('[0]', nsb);
            $(this).attr('for', new_for);
        });
        // set the chunk set's label
        new_set.find('span').text(chunk_num_sets);

        // allow jqm enhancements
        new_set.find('[data-enhanced]').each(function() {
            $(this).removeAttr('data-enhanced');
        });

        // append copy to this section
        new_set.attr('id', `chunk_${chunk_num_sets}`);
        new_set.appendTo(tpl.parent());
        new_set.show();

        // jqm needs to be told to apply UI enhancements
        new_set.enhanceWithin();

        // PBSOpts needs to be told to watch new elements
        pbs_obj.append_chunk(new_set);

        chunk_rm_btn.show();
    });

    chunk_rm_btn.on('click', function() {
        if (!chunk_num_sets)
            return;

        $(`#chunk_${chunk_num_sets}`).remove();
        pbs_obj.remove_chunk(chunk_num_sets);
        --chunk_num_sets;

        if (!chunk_num_sets)
            chunk_rm_btn.hide();
    });
    chunk_rm_btn.hide();
    $('#chunk_tpl').hide();

    pbs_obj = new PBSOpts();

    // <textarea> elems only auto-adjust their size on keyup, not on change
    $('textarea').trigger('keyup');
}

$(document).ready(setup_form);
$(document).on('pagehide', setup_form);
