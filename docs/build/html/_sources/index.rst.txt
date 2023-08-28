.. HPC-GUI documentation master file, created by
   sphinx-quickstart on Tue Aug 22 12:58:32 2023.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

HPC-GUI documentation
=====================

HPC-GUI is a web application that is intended to be accessed from a web browser. There are pros and cons to this approach.

Pros:

* A website can be hosted centrally or locally (on the user's machine)
* The application is agnostic to the user's operating system, hardware specs, etc.
* Common browsers are well-tested, handle a lot of behaviors automatically, and are fault tolerant.
* Web languages are highly backwards-compatible, so an application that works now is (relatively) future-proof.

Cons:

* Browsers are RAM and CPU intensive.
* Client-server communication is necessary even when both are located on the same machine.

.. toctree::
   :maxdepth: 3
   :caption: Contents:

   usage
   server
   client
   future

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
