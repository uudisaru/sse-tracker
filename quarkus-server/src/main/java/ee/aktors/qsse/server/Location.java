package ee.aktors.qsse.server;

public class Location {
  transient public long i;
  public double[] pos;
  public long ts;
  transient public double dts;

  public Location() {
    // Default constructor
  }

  public Location(long i, double[] pos, double dts) {
    this.i = i;
    this.pos = pos;
    this.dts = dts;
    this.ts = Math.round(dts);
  }
}
