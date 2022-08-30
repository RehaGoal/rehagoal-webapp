#!/usr/bin/env python3

import shutil
import glob
import os
import subprocess

REPORT_DIR = "reports/coverage/"
COMBINED_REPORT_DIR = os.path.join(REPORT_DIR, "combined")
KARMA_REPORT_DIR = os.path.join(REPORT_DIR, "karma")
PROTRACTOR_REPORT_DIR = os.path.join(REPORT_DIR, "protractor")
COVERAGE_FILE = "coverage-final.json"
COVERAGE_COMBINED_FILE = "coverage-combined.json"

if __name__ == "__main__":
    karma_coverage_file = next(glob.iglob(os.path.join(KARMA_REPORT_DIR, "*", COVERAGE_FILE)))
    protractor_coverage_file = os.path.join(PROTRACTOR_REPORT_DIR, COVERAGE_FILE)
    tmp_karma_coverage_file = os.path.join(REPORT_DIR, "coverage-karma.json")
    tmp_protractor_coverage_file = os.path.join(REPORT_DIR, "coverage-protractor.json")
    shutil.copy(karma_coverage_file, tmp_karma_coverage_file)
    shutil.copy(protractor_coverage_file, tmp_protractor_coverage_file)
    subprocess.check_call(["nyc", "merge", REPORT_DIR, os.path.join(COMBINED_REPORT_DIR, COVERAGE_COMBINED_FILE)])
    os.remove(tmp_karma_coverage_file)
    os.remove(tmp_protractor_coverage_file)
    subprocess.check_call(["nyc", "report", "-t", COMBINED_REPORT_DIR, "--reporter=lcov", "--reporter=text", "--reporter=text-summary", "--report-dir", COMBINED_REPORT_DIR])
