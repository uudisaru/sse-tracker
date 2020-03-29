package ee.aktors.qsse.server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.sse.OutboundSseEvent;
import javax.ws.rs.sse.Sse;
import javax.ws.rs.sse.SseEventSink;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Path("/")
@ApplicationScoped
public class LocationController {

  private static final Logger LOG = LoggerFactory.getLogger(LocationController.class);
  private static final Gson GSON = new GsonBuilder().create();
  private static final List<Location> LOCATIONS = GeoUtils.loadLocations();

  Sse sse;
  OutboundSseEvent.Builder eventBuilder;

  @Context
  public void setSse(Sse sse) {
    this.sse = sse;
    this.eventBuilder = sse.newEventBuilder();
  }

  @GET
  @Path("locations")
  @Produces(MediaType.SERVER_SENT_EVENTS)
  public void subscribe(@Context SseEventSink sseEventSink, @QueryParam("speed") Long speed) {
    if (speed == null) {
      speed = 5L;
    }
    LOG.info("Locations with speed {}", speed);
    AtomicReference<Double> lastTs = new AtomicReference<>(0.0);
    // km/hour -> m/sec
    double finalSpeed = (speed * 1000.0) / 3600.0;
    LOG.info("Speed in m/s: {}", finalSpeed);

    new Thread(
            () -> {
              try (SseEventSink sink = sseEventSink) {
                LOCATIONS.forEach(
                    location -> {
                      if (sink.isClosed()) {
                        return;
                      }
                      long waitFor = Math.round(((location.dts - lastTs.get()) / finalSpeed) * 1000);
                      if (waitFor > 0) {
                        try {
                          Thread.sleep(waitFor, 0);
                        } catch (InterruptedException e) {
                          Thread.currentThread().interrupt();
                          throw new IllegalStateException(e);
                        }
                      }
                      OutboundSseEvent sseEvent =
                          this.eventBuilder
                              .id(Long.toString(location.i))
                              .name("pos")
                              .data(
                                  GSON.toJson(
                                      new Location(
                                          location.i,
                                          location.pos,
                                          Math.round((location.dts / finalSpeed) * 1000.0))))
                              .build();
                      sink.send(sseEvent);
                      lastTs.set(location.dts);
                    });
                OutboundSseEvent sseEvent =
                    this.eventBuilder
                        .id("end")
                        .name("end")
                        .data("end")
                        .build();
                sink.send(sseEvent);
              }
            })
        .start();
  }
}
