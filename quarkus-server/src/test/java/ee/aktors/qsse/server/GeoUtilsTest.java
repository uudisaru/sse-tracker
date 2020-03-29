package ee.aktors.qsse.server;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GeoUtilsTest {

  @Test
  void loadLocations() {
    var locations = GeoUtils.loadLocations();
    assertEquals(0, locations.get(0).ts);
    // x: 16,697923619 y: −13,14736531 sqrt(abs(x*y)) = 14,816659543
    assertEquals(15, locations.get(1).ts);
  }
}
