.. role:: python(code)
   :language: python
.. role:: jinja(code)
   :language: jinja

Server-side API
===============

Dependencies
------------

HPC-GUI uses `FastAPI`_ (0.78.0), which itself uses `Starlette`_ and `Jinja`_ (3.1.2).

Routes
------

Web pages are implemented by configuring a response to a browser endpoint/route. The NAMD Single Node example has the route ``/namd_single``. In the simplest case, a new page can be implemented by adding a function to ``main.py`` with  the :python:`@app` decorator functions and returning the page's contents.

However, since there are currently no pages that require server-side processing other than Jinja template rendering, the logic of page fetching is done by reading page details from YAML configuration files ``menu.yml``, ``pages.yml``, and ``tooltips.yml``.

Home page
^^^^^^^^^

The home page is the only page with an explicit route function in ``main.py``. All others are referenced in the menu config.

404 page
^^^^^^^^

This route is used for all unimplemented pages. Ideally, the HTTP status code 404 should be returned any time the 404 page is reached, but jQuery mobile doesn't display the contents of pages returned this way. Thus, the page currently returns a 200 status.

.. _menu.yml:

Menu config
^^^^^^^^^^^

The menu configuration (``menu.yml``) defines the link order and hierarchy for the left (navigation) sidebar. If the menu item is a submenu, then no endpoint is associated with it, and clicking it instead toggles the submenu's visibility.

Generally, if a menu item is configured like this:

.. code-block:: yaml

   mypage:
     text: link to my page

then it will create a menu entry pointing to ``/mypage`` with the link text ``link to my page``.

The following properties have special behavior within this config file:

========  ===========
Property  Description
========  ===========
text      displayed link text
icon      icon to use (default: carat-r)
path      link's href (default: parent's name)
sub_menu  indicates that the contained entries are a submenu
========  ===========

Pages config
^^^^^^^^^^^^

The pages configuration (``pages.yml``) maps a page/endpoint a dict that will be passed directly to the page's Jinja template as the variable ``page``. Currently, the only required property is the page title.

========  ===========
Property  Description
========  ===========
title     page title to display in header
========  ===========

Tooltips config
^^^^^^^^^^^^^^^

Every tooltip's text is located in ``tooltips.yml``. A tooltip can be added in a Jinja template manually via the :jinja:`form.tooltip()` macro, e.g. (from ``templates/parts/pbs.html``):

.. code-block:: jinja

   {{ form.tooltip('PBS[chunk][help]') }}

But it is intended for most tooltips to be added to fields automatically and for related fields to be grouped in the config file. Automatic tooltips are applied via a lookup in ``tooltips.yml`` by the field's HTML name attribute. Given a tooltip configuration that looks like this:

.. code-block:: yaml

    my:
      field:
        name:
          my tooltip text

The following field names will cause the an info (i) button to appear with the text "my tooltip text":

#. :jinja:`my[field][name]`
#. :jinja:`my[field_name]`
#. :jinja:`my_field_name`

This can also be formatted multiple ways in the YAML file. The following YAML entries are all valid for a field named :jinja:`my_field_name`:

.. code-block:: yaml

   my:
     field:
      name:
        my tooltip text

.. code-block:: yaml

   my:
     field_name:
       my tooltip text

.. code-block:: yaml

    my_field_name:
      my tooltip text

Field names that are more deeply nested have higher priority during automatic tooltip lookups than less nested names. So, for a config like this:

.. code-block:: yaml

   my:
     field_name:
       field text 1
     field:
       name:
         field text 2

The tooltip "field text 1" would be inaccessible. Name your fields with this constraint in mind.

utils.py
--------

.. automodule:: utils
   :members:

Jinja Templates
===============

All templates use whitespace control to ensure that the output of ``./compile endpoint_name`` is formatted to have 4 spaces of indentation for most nested tags. This ensures readability of compiled output.

Layouts
-------

There is only one layout, the single-page layout located at ``templates/layouts/single_page.html``. The name "single page" refers to the jQuery mobile feature to load multiple pages into a cache simultaneously. HPC-GUI attempts to work with jQuery mobile's page caching, but still waits for the user to click on a page's link before loading it.

Parts
-----

HPC-GUI attempts to put as much of the logic of form generation into an easy(-ish) to use set of Jinja macros. Jinja macros are functions that are defined in an HTML template and which return HTML content. They can also read and write to Jinja template variables; this is important because the Jinja Python API does not allow modifying template variables within Python functions (including user-defined Jinja `filters`_).

Throughout the templates, in most places where an element ID goes, the ID contains ``{{ page_id }}`` in order to ensure that IDs remain unique across all pages. This is necessary because many DOM manipulations will fail if jQuery mobile loads multiple pages with elements that have duplicated IDs.

header.html
^^^^^^^^^^^

The header contains the page title. For small screens (e.g., mobile browsers) it will also show a navigation / menu button.

footer.html
^^^^^^^^^^^

The footer only contains a copyright notice.

navigation.html
^^^^^^^^^^^^^^^

The navigation panel has two elements which are selectively hidden/shown via CSS rules (in ``/static/style.css`` based on the screen size). For small screens, a hideable overlay is used. For larger screens, an expanded panel is used.

The nav menu's contents are populated by passing the contents of :ref:`menu.yml` to :py:func:`list.anchor_list`.

list.html
^^^^^^^^^

Contains a single macro for rendering a list of links.

.. py:function:: list.anchor_list(items, collapsible=False, ul_attrs=None)

   Recursively traverses ``items`` to and returns jQuery mobile style listview.

   Any entry with the key ``sub_menu`` is rendered recursively.

   :param items: list items to render
   :type items: ordered mapping

   :param collapsible: whether submenus can be expanded and collapsed
   :type collapsible: bool

   :param ul_attrs: any HTML attributes to add to the outer <ul> element
   :type ul_attrs: mapping

   :return: unordered list element

form.html
^^^^^^^^^

This template contains most of the logic to produce form elements as Jinja macros.

.. py:function:: form.tooltip(id, lookup=None)

   Looks up a given ``id`` via :py:func:`utils.auto_tooltip`. If a tooltip text is returned, then it is formatted in the way required by jQuery mobile.

   :param id: tooltip ID
   :type id: str

   :param lookup: ID to lookup if not the ID of the tooltip element
   :type lookup: str or None

   :return: anchor with tooltip style and div with tooltip text

.. py:function:: form.tooltip_anchor(href_id)

   Returns a tooltip icon that, when clicked, shows the text in ``href_id``

   :param href_id: ID of tooltip div to show
   :type href_id: str

   :return: anchor

.. py:function:: form.tooltip_div(id, text)

   Returns a div containing a tooltip's text.

   :param id: ID of tooltip div
   :type id: str

   :param text: tooltip text
   :type text: str

   :return: tooltip div

.. py:function:: form.field_contain(add_div)

   Shortcut to optionally wrap caller's text in a jQuery mobile field container.

   See :py:func:`form.wrap_tag` for details.

   :param add_div: whether to perform the wrapping
   :type add_div: bool

   :return: optionally wrapped text

.. py:function:: form.wrap_tag(tag, wrap=True, wrapper_attrs=None)

   Handles optional wrapping and indentation of caller's text with an opening
   and closing tag. The optional behavior helps condense code because Jinja's
   if/else tags take up a lot of space.

   :param tag: HTML tag with which to optionally wrap
   :type tag: str

   :param wrap: whether to use tag to wrap caller's text
   :type wrap: bool

   :param wrapper_attrs: HTML attributes to add to tag element
   :type wrapper_attrs: mapping or None

   :return: optionally wrapped text

.. py:function:: form.label_field(text, _for=None)

   If ``text`` is not None, returns a label with the given text.

   :param text: label text, if any
   :type text: str or None

   :param _for: ID of form input associated with this label
   :type _for: str or None

   :return: optional label

.. py:function:: form.legend_field(text)

   If ``text`` is not None, returns a legend with the given text.

   :param text: legend text, if any
   :type text: str or None

   :return: optional legend

.. py:function:: form.input(name, value='', type='text', size=20, label=None, add_div=True, mini=False)

   Adds an HTML input element with an optional label and div container.

   Input's ID is automatically generated from the current page ID and ``name``,
   to ensure uniqueness across pages. N.B. any jQuery selections based on the
   name should still include the page ID to ensure the correct element is
   selected. See :js:func:`jq_name` for more details.

   :param name: input's HTML name attribute
   :type name: str

   :param value: input's default value
   :type value: any

   :param type: HTML type attribute; see `MDN (input)`_ for more details
   :type type: str

   :param size: HTML size attribute; see `MDN (input)`_ for more details
   :type size: int

   :param label: optional label text
   :type label: str or None

   :param add_div: whether to wrap input with a jQuery mobile field container
   :type add_div: bool

   :param mini: whether to use jQuery mobile mini-style input
   :param mini: bool

   :return: HTML input element

.. py:function:: form.checkbox(name, checked=False, label=None)

   Return a single checkbox with jQuery mobile styling.

   :param name: HTML name attribute
   :type name: str

   :param checked: whether the box is checked by default
   :type checked: bool

   :param label: optional label text

.. py:function:: form.checkbox_group(id, options, legend=None, horizontal=False)

   Return a group of related checkboxes with jQuery mobile styling.

   The items in options can contain any mix of mappings, list/tuple, and str.

   Dict items can contain:

   =======  ====  ========  ===============================================
   param    type  required  description
   =======  ====  ========  ===============================================
   name     str   yes       option HTML name attribute
   id       str   no        checkbox ID (default: same as name)
   label    str   no        checkbox label text
   checked  bool  no        whether checked by default (default: ``False``)
   =======  ====  ========  ===============================================

   List or tuple items format: ``(name, label, [checked])``. I.e., ``name`` and
   ``label`` are required, ID is set to the same as ``name``, and ``checked``
   is ``False`` if absent.

   If the item is a string, then all of ``(name, label, id)`` are set to the
   string's value and the box's default state is unchecked.

   :param id: ID of checkbox group HTML container element
   :type id: str

   :param options: options to group together
   :type options: list

   :param legend: like a label, but for the whole group
   :type legend: str or None

   :param horizontal: display options horizontally (default: vertical)
   :type horizontal: bool

   :return: group of checkboxes

.. py:function:: form.textarea(name, value='', label=None)

   Returns a textarea element. See :py:func:`form.input` for option details.

.. py:function:: form.path(name, add_div=True)

   Returns a text input with ``Courier New`` font.

.. py:function:: form.select(name, options, label=None, add_div=True)

   Returns a select element with jQuery mobile styling.

   The items in options can contain any mix of mappings, list/tuple, and str.

   Dict items can contain:

   ========  ====  ========  =============================
   param     type  required  description
   ========  ====  ========  =============================
   value     str   yes       internal option value
   text      str   no        option display text
   selected  bool  no        select this option by default
   ========  ====  ========  =============================

   List or tuple items format: ``(value, text, [selected])``.

   If the item is a string, then both ``value`` and ``text`` are set to the
   string's value and the box's default state is unselected.

   N.B. only one option can be selected at the same time. If no items have the
   ``selected`` attribute, browsers automatically use the first option given.

   :param name: name/ID of select element
   :type name: str

   :param options: options to include in select
   :type options: list

   :param label: optional label text
   :type label: str or None

   :param add_div: whether to wrap this element in a field container
   :type add_div: bool

   :return: select element with optional wrapper and label

.. py:function:: form.radio(name, options, legend=None, add_fieldset=True, horizontal=False, mini=False, no_enhance=False)

   Creates a set of radio options

   The items in options can contain any mix of mappings, list/tuple, and str.

   Dict items can contain:

   ========  ====  ========  ==============================================
   param     type  required  description
   ========  ====  ========  ==============================================
   value     str   yes       used as internal value and display text
   selected  bool  no        select this option by default (default: False)
   ========  ====  ========  ==============================================

   List or tuple items format: ``(value, [selected])``.

   If item is a string, ``value`` is the string's value, and ``selected`` is
   ``False``.

   :param name: name of radio group
   :type name: str

   :param legend: optional legend text
   :type legend: str or None

   :param add_fieldset: whether to wrap in fieldset with jQuery mobile styling
   :type add_fieldset: bool

   :param mini: whether to use jQuery mobile mini style
   :type mini: bool

   :param no_enhance: if ``True`` tells jQuery mobile not to apply styling
   :type no_enhance: bool

   :return: radio option group

.. py:function:: form.input_integer(name, value=0, pattern="-?[0-9]+", size=None)

   Shortcut for numeric input. See :py:func:`form.input` for details.

   TODO: use ``pattern`` to validate input value.

.. py:function:: form.non_negative_integer(name, value=0, pattern="[0-9]+", size=None)

   Shortcut for numeric input. See :py:func:`form.input` for details.

   TODO: use ``pattern`` to validate input value.

.. py:function:: form.positive_integer(name, value=1, pattern="[1-9][0-9]*", optional=False, size=None)

   Shortcut for numeric input. See :py:func:`form.input` for details.

   TODO: use ``pattern`` to validate input value.

.. py:function:: form.memory_size(name, value=0, pattern="[1-9][0-9]*", label=None, num_opts=None, radio_opts=None, no_enhance=False)

   Creates a custom memory size widget.

   :param num_opts: passed to :py:func:`form.positive_integer`
   :type num_opts: mapping or None

   :param radio_opts: passed to :py:func:`form.radio`
   :type radio_opts: mapping or None

pbs.html
^^^^^^^^^

This template generates PBS options.

.. py:function:: pbs.resources

   Adds all PBS options, including chunk limits.

   :param kwargs: any additional args are passed to :py:func:`pbs.chunk_limits`

.. py:function:: pbs.chunk_limits(tid='chunk_tpl')

   Adds chunk-based settings.

   :param tid: ID of template chunk
   :type tid: str

   :param default_chunks: PBS select string to populate chunk section
   :type default_chunks: str

   :param mpiprocs: whether to include MPI processes option
   :type mpiprocs: bool

   :param ompthreads: whether to include OMP threads option
   :type ompthreads: bool

utils.html
^^^^^^^^^^

Macros used in most other templates

.. py:function:: utils.css_selector(tag=None, id=None, classes=None)

   Returns a CSS selector

   :param kwargs: arbitrary attributes to include in selector
   :type kwargs: mapping or None

.. py:function:: utils.comment_css_sel(args=None)

   Returns an HTML comment containing a CSS selector

   :param args: arbitrary attributes to include in selector
   :type args: mapping or None

.. py:function:: utils.cat_attrs(args=None) 

   Concatenates HTML attributes and returns the result as a string of all attrs

   :param args: HTML attributes to include
   :type args: mapping or None

.. py:function:: utils.cat_classes(classes)

   Concatenates classes and returns the result as an HTML attribute string

   :param classes: classes to include
   :type classes: list

.. py:function:: utils.include_indented(path)

   Includes a Jinja template with an indent filter applied. Any kwargs are passed to `Jinja.indent`

   :param path: path to template to include, from project root
   :type path: str

.. _FastAPI: https://fastapi.tiangolo.com/
.. _Starlette: https://www.starlette.io/
.. _Jinja: https://jinja.palletsprojects.com/en/3.1.x/
.. _filters: https://jinja.palletsprojects.com/en/3.1.x/api/#custom-filters
.. _MDN (input): https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
.. _Jinja.indent: https://jinja.palletsprojects.com/en/3.1.x/templates/#jinja-filters.indent
