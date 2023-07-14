# Installation

Currently, HPC-GUI assumes you have the following installed and loaded:

1. Conda/Anaconda
2. A conda environment named `balsam`

If not, you should install Balsam by following the instructions shown [here](https://balsam.readthedocs.io/en/latest/user-guide/installation/).

# Usage

HPC-GUI is in pre-alpha development stage; it is intended to be run and accessed on your personal computer only.

To access the GUI:

1. Navigate a terminal to the HPC-GUI directory.
2. Run `./run_server.sh`, which starts a local server session accessible *only* bound to the IP `127.0.0.1`.
3. Open [127.0.0.1:8000](http://127.0.0.1:8000) in your web browser.
