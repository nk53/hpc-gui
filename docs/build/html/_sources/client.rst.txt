.. role:: jinja(code)
   :language: jinja
.. role:: js(code)
   :language: javascript

Client-side API
===============

Dependencies
------------

HPC-GUI uses `jQuery`_ (1.11.1) and `jQuery mobile`_ (1.4.5) JavaScript libraries.

For documenters
^^^^^^^^^^^^^^^

Compiling this document requires `sphinx-js`_.

.. _forms.js:

forms.js
--------

.. js:autoclass:: PBSOpts
   :members:

.. js:autofunction:: nth_key
.. js:autofunction:: first_key

For the ``jq_`` and ``sel_`` functions, see `Attribute selectors`_ for more info on the meaning of ``rel``.

.. js:autofunction:: jq_name
.. js:autofunction:: sel_name
.. js:autofunction:: jq_attr
.. js:autofunction:: sel_id
.. js:autofunction:: jq_id
.. js:autofunction:: jq_label
.. js:autofunction:: sel_label
.. js:autofunction:: sel_attr

.. js:autofunction:: update_code
.. js:autofunction:: toggle_email
.. js:autofunction:: setup_form

``data-function`` callbacks
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Special functions that handle the update of a particular string within the shell script template.

These must have the following format and should not return anything:

.. js:function:: callback

   :param target: the element to update
   :type target: jQuery

   :param src: name of input whose value replaces target's inner HTML
   :type src: String

.. js:autofunction:: num_to_range_list

.. _jQuery: https://api.jquery.com
.. _jQuery mobile: https://api.jquerymobile.com/
.. _sphinx-js: https://github.com/mozilla/sphinx-js
.. _pagecontainerload: https://api.jquerymobile.com/pagecontainer#event-load
.. _Attribute selectors: https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors
