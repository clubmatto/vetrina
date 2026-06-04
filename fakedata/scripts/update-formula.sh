#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <version> <output-path>"
  echo "Example: $0 0.0.1 brew/FakeData/fakedata.rb"
  exit 1
fi

VERSION="$1"
OUTPUT="$2"
TAG="fakedata/v${VERSION}"
REPO="clubmatto/vetrina"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CHECKSUMS_URL="https://github.com/${REPO}/releases/download/${TAG}/fakedata_${VERSION}_checksums.txt"
CHECKSUMS_FILE="${TMPDIR}/checksums.txt"

echo "Downloading checksums from ${CHECKSUMS_URL}..."
curl -sfL "$CHECKSUMS_URL" -o "$CHECKSUMS_FILE"

get_sha() {
  grep "fakedata_${VERSION}_$1.tar.gz" "$CHECKSUMS_FILE" | cut -d' ' -f1
}

DARWIN_AMD64=$(get_sha "darwin_amd64")
DARWIN_ARM64=$(get_sha "darwin_arm64")
LINUX_AMD64=$(get_sha "linux_amd64")
LINUX_ARM64=$(get_sha "linux_arm64")

if [ -z "$DARWIN_AMD64" ] || [ -z "$DARWIN_ARM64" ] || [ -z "$LINUX_AMD64" ] || [ -z "$LINUX_ARM64" ]; then
  echo "ERROR: Could not find all required checksums in ${CHECKSUMS_FILE}"
  exit 1
fi

cat > "$OUTPUT" <<FORMULA
class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "${VERSION}"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/${REPO}/releases/download/${TAG}/fakedata_${VERSION}_darwin_amd64.tar.gz"
      sha256 "${DARWIN_AMD64}"
    elsif Hardware::CPU.arm?
      url "https://github.com/${REPO}/releases/download/${TAG}/fakedata_${VERSION}_darwin_arm64.tar.gz"
      sha256 "${DARWIN_ARM64}"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/${REPO}/releases/download/${TAG}/fakedata_${VERSION}_linux_amd64.tar.gz"
      sha256 "${LINUX_AMD64}"
    elsif Hardware::CPU.arm?
      url "https://github.com/${REPO}/releases/download/${TAG}/fakedata_${VERSION}_linux_arm64.tar.gz"
      sha256 "${LINUX_ARM64}"
    end
  end

  def install
    bin.install "fakedata"
  end

  test do
    output = shell_output("#{bin}/fakedata --help")
    assert_match "fakedata", output
  end
end
FORMULA

echo "Formula updated at ${OUTPUT}"
