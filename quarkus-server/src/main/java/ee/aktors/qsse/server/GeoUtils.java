package ee.aktors.qsse.server;

import org.locationtech.proj4j.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public final class GeoUtils {
  private static final CoordinateTransform COORDINATE_TRANSFORM;

  static {
    final CoordinateTransformFactory ctFactory = new CoordinateTransformFactory();
    final CRSFactory csFactory = new CRSFactory();
    final CoordinateReferenceSystem epsg3857 = csFactory.createFromName("EPSG:3857");
    final CoordinateReferenceSystem epsg4326 = csFactory.createFromName("EPSG:4326");
    COORDINATE_TRANSFORM = ctFactory.createTransform(epsg4326, epsg3857);
  }

  private GeoUtils() {
    // Disable the construction of utility class
  }

  public static List<Location> loadLocations() {
    ProjCoordinate last = null;
    var locations = new ArrayList<Location>();
    String row;
    long i = 0;
    long ts = 0; // Timestamp if speed = 1 m/sec

    try (InputStream is = GeoUtils.class.getResourceAsStream("/data/tew.csv")) {
      BufferedReader reader = new BufferedReader(new InputStreamReader((is)));
      while ((row = reader.readLine()) != null) {
        var parts = row.split(",");
        ProjCoordinate coord = wgs84toEpsg3857(Double.valueOf(parts[1]), Double.valueOf(parts[0]));

        if (last != null) {
          ts += distance(last, coord);
        }
        locations.add(new Location(i, new double[]{coord.x, coord.y}, ts));
        i++;
        last = coord;
      }
    } catch (IOException e) {
      throw new ExceptionInInitializerError(e);
    }

    return locations;
  }

  private static long distance(ProjCoordinate from, ProjCoordinate to) {
    return Math.round(Math.sqrt(Math.abs((from.x - to.x) * (from.y - to.y))));
  }

  private static ProjCoordinate wgs84toEpsg3857(Double lon, Double lat) {
    ProjCoordinate from = new ProjCoordinate();
    ProjCoordinate to = new ProjCoordinate();
    from.x = lon;
    from.y = lat;

    COORDINATE_TRANSFORM.transform(from, to);
    return to;
  }
}
