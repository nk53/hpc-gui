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

function set_pbs_opts() {
    console.log('got here');
}

function update_code() {
    $('[name=code]').val( $('#script_tpl').text() );
}

var event_handlers = [];
function setup_form() {
    // remove any pre-existing event handlers set by this function
    for (let i = 0; i < event_handlers.length; ++i) {
        let src = event_handlers[0];
        let updater = event_handlers[1];
        $(src).off(updater);
    }

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

        const src = $(`[name=${src_name}]`);

        // on input change, use callback function
        function updater() {
            callback(target, src);
            update_code();
        }

        src.change(updater);
        updater();
        event_handlers.push([src, updater]);
    });

    // <textarea> elems only auto-adjust their size on keyup, not on change
    $('textarea').trigger('keyup');
}

$(document).ready(setup_form);
$(document).on('pagehide', setup_form);
