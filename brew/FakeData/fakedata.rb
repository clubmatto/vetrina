class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.0.2"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.2/fakedata_0.0.2_darwin_amd64.tar.gz"
      sha256 "8b583346aeef10d68ffa87a3337a6ecd2462cc434a06eec5edd35b56551551e2"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.2/fakedata_0.0.2_darwin_arm64.tar.gz"
      sha256 "04cff7fac60c78a0b9caa93764f3097f76f20cfd4e5340060a9c35cf1e3d51fd"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.2/fakedata_0.0.2_linux_amd64.tar.gz"
      sha256 "7bd1882e94f3be43dc54db8477e178e77caa99c94459775d1fe6465c96f6789c"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.2/fakedata_0.0.2_linux_arm64.tar.gz"
      sha256 "e93d2e27241618dda8b79cfad361edf3fc15c98e3cdb5a2cd632cce9fe7a48d8"
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
