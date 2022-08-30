#!/usr/bin/env python3

import logging
import os
import subprocess
import signal
import platform
import shutil
import itertools
import time
import atexit
from urllib.request import urlopen
from urllib.error import URLError

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)
LOG = logging.getLogger(__name__)

WWW_ROOT = "www/"
REPORT_DIR = "reports/coverage/protractor"
COVERAGE_DIR = "coverage/"
WEBSERVER_HOST = "127.0.0.1"
WEBSERVER_PORT = 8000
INSTRUMENTED_DIR = "tmp/"
INSTRUMENT_EXCLUDE = [
    os.path.join(WWW_ROOT, "bower_components/**"),
    os.path.join(WWW_ROOT, "components/tts/mespeak/mespeak.{full,min}.js")
]

def run_webserver(host=WEBSERVER_HOST, port=WEBSERVER_PORT, directory=INSTRUMENTED_DIR):
    return subprocess.Popen(["npm", "run", "_start", "--", "--hostname", host, "--port", str(port), "--directory", directory],
                            preexec_fn=os.setsid)

def wait_for_webserver(timeout=None):
    t_start = time.time()
    while timeout is None or time.time() - t_start < timeout:
        try:
            urlopen("http://%s:%d/" % (WEBSERVER_HOST, WEBSERVER_PORT))
            return True
        except URLError as err:
            time.sleep(0.5)
    return False

def kill_process_group(pid):
    if platform.system() != 'Windows':
        pgid = os.getpgid(pid)
        os.killpg(pgid, signal.SIGKILL)
    else:
        os.kill(pid, signal.SIGTERM)

def cleanup():
    for p in child_procs:
        LOG.info("Killing [PID %d] %s", p.pid, p.args)
        kill_process_group(p.pid)

if __name__ == "__main__":
    child_procs = []
    exit_code = 0
    atexit.register(cleanup)
    if os.path.exists(COVERAGE_DIR):
        LOG.info("Deleting coverage directory...")
        shutil.rmtree(COVERAGE_DIR)
    if os.path.exists(INSTRUMENTED_DIR):
        LOG.info("Deleting instrumented directory...")
        shutil.rmtree(INSTRUMENTED_DIR)
    LOG.info("Copying files to instumented directory...")
    shutil.copytree(WWW_ROOT, INSTRUMENTED_DIR)
    LOG.info("Instrumenting files...")
    exclude_instrument_args = list(itertools.chain.from_iterable([["-x", exclude] for exclude in INSTRUMENT_EXCLUDE]))
    instrumentation_argv = ["nyc", "instrument", "--all"] + exclude_instrument_args + [WWW_ROOT, INSTRUMENTED_DIR]
    instrumentation_proc = subprocess.check_call(instrumentation_argv)

    LOG.info("Starting webserver...")
    webserver_proc = run_webserver()
    child_procs.append(webserver_proc)
    assert wait_for_webserver(timeout=10)
    LOG.info("Webserver started.")

    LOG.info("Running protractor...")
    try:
        subprocess.check_call(["npm", "run", "protractor"])
    except subprocess.CalledProcessError as error:
        exit_code = error.returncode

    LOG.info("Generating coverage report...")
    coverage_report_argv = ["nyc", "report", "-t", COVERAGE_DIR, "--reporter=lcov", "--reporter=json", "--report-dir", REPORT_DIR]
    subprocess.check_call(coverage_report_argv)
    LOG.info("Done.")

    exit(exit_code)


