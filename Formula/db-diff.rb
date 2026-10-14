class DbDiff < Formula
  desc "Compare one table across two databases by checksumming"
  homepage "https://matto.club/vetrina/db-diff"
  license "MIT"
  version "0.0.5"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.5/db-diff_0.0.5_darwin_amd64.tar.gz"
      sha256 "699275f4e26ca33de78f60e43b54f70582483271bf81e1c38c37c4bd4878c97b"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.5/db-diff_0.0.5_darwin_arm64.tar.gz"
      sha256 "a89fccdbd5cba12c595e1073e8f51102ba134f877ba14152bdfbe2afbd397612"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.5/db-diff_0.0.5_linux_amd64.tar.gz"
      sha256 "6d338c4868be1e4360c46710523520ebcbedb8524135ee1795e65b7ee00d7265"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.5/db-diff_0.0.5_linux_arm64.tar.gz"
      sha256 "c0fd57cc29814a2feb0aad3d8bce3d5b708cdcdaae42e15fefddb2c93c3e812a"
    end
  end

  def install
    bin.install "db-diff"
  end

  test do
    output = shell_output("#{bin}/db-diff --help")
    assert_match "db-diff", output
  end
end
