class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.0.3"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.3/fakedata_0.0.3_darwin_amd64.tar.gz"
      sha256 "2ebf4e86b15d26a616ba35a642f1cf68cf688f115a2b37c6d740410ec4b1bc72"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.3/fakedata_0.0.3_darwin_arm64.tar.gz"
      sha256 "82085fe194f3512557098695718a9ff0433e10440eec2c40645e560ee533b937"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.3/fakedata_0.0.3_linux_amd64.tar.gz"
      sha256 "af1029c0e78a127424ac6920f22f11189de5821cda90ade10cd09bb66b0381ee"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.3/fakedata_0.0.3_linux_arm64.tar.gz"
      sha256 "fb82cdd9ebd8b35db658575120607dba86a910e6815d9b2057a3e3639d8858f8"
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
