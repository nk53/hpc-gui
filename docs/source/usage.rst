.. _installation:

Installation
============

Installation and basic usage instructions can be found on GitHub `here <https://github.com/nk53/hpc-gui>`_.

Usage
=====

Helper scripts
--------------

run_server.sh
^^^^^^^^^^^^^

Assuming that you went with the Balsam installation approach, this script ensures that the ``balsam`` conda environment is enabled, copies the site URL to your clipboard (macOS only), and starts the HPC-GUI server to listen on port 8000. The provided options to ``uvicorn`` will only allow access by localhost. To enable access by remote hosts, add the CLI option ``--host 0.0.0.0``.

This script is provided for development purposes. It can be run without arguments:

.. code-block:: console

   $ ./run_server.sh

Note that the ``--reload`` option to ``uvicorn`` used in ``run_server.sh`` automatically detects changes to ``main.py`` and any imported Python sources, but it does *not* detect changes to other resources read by Python, such as YAML files. To see those changes reflected, you must manually restart the web server (Ctrl-C, then rerun ``./run_server.sh``).

Other static files (``style.css`` and ``form.js``) are cached by the user's web browser. To see them reflected, you can either disable caching, or add/change a query parameter to the referenced resource in ``templates/layouts/single_page.html``. For example, the browser would be forced to reload ``/static/style.css`` if the ``<link>`` path is changed from this:

.. code-block:: jinja

    <link href="{{ url_for('static', path='/style.css') }}" rel="stylesheet">

To this:

.. code-block:: jinja

    <link href="{{ url_for('static', path='/style.css') }}?v0.1" rel="stylesheet">

Obviously, there is no reason to do the latter approach for local development, but it can be useful for rapid changes to deployed code.

compile
^^^^^^^

This script queries a given endpoint and returns the raw HTML response. It can thus be seen as a way of compiling Jinja2 templates to HTML while avoiding the JavaScript evaluation performed by the web browser. This is a convenient way of checking what the HTML looks like before it is manipulated by (mainly) jQuery mobile.

It requires the ``curl`` and ``less`` command-line programs.

Example usage:

.. code-block:: console

   $ ./compile namd_single
