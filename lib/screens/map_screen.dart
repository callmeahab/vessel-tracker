import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/vessel_provider.dart';
import '../models/vessel.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  MapboxMap? mapboxMap;
  late String mapboxToken;

  @override
  void initState() {
    super.initState();
    mapboxToken = dotenv.env['MAPBOX_ACCESS_TOKEN'] ?? '';
    if (mapboxToken.isNotEmpty) {
      MapboxOptions.setAccessToken(mapboxToken);
    }
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<VesselProvider>(context, listen: false);
    await provider.fetchParkBoundaries();
    await provider.fetchVesselsInPark();
  }

  void _onMapCreated(MapboxMap mapboxMap) {
    this.mapboxMap = mapboxMap;
    _setupMap();
  }

  Future<void> _setupMap() async {
    if (mapboxMap == null) return;

    // Center on La Maddalena National Park
    await mapboxMap!.setCamera(CameraOptions(
      center: Point(coordinates: Position(9.4167, 41.2167)),
      zoom: 10.0,
    ));

    // Add park boundaries and vessel markers
    final provider = Provider.of<VesselProvider>(context, listen: false);
    if (provider.parkBoundaries != null) {
      await _addParkBoundaries(provider.parkBoundaries!);
    }

    await _addVesselMarkers();
  }

  Future<void> _addParkBoundaries(Map<String, dynamic> geoJson) async {
    if (mapboxMap == null) return;

    try {
      // Convert the GeoJSON to string format for Mapbox
      final geoJsonString = jsonEncode(geoJson);

      await mapboxMap!.style.addSource(GeoJsonSource(
        id: "park-boundaries",
        data: geoJsonString,
      ));

      await mapboxMap!.style.addLayer(FillLayer(
        id: "park-fill",
        sourceId: "park-boundaries",
        fillColor: const Color(0x4000FF00).value,
        fillOutlineColor: const Color(0xFF00FF00).value,
      ));
    } catch (e) {
      print('Error adding park boundaries: $e');
    }
  }

  Future<void> _addVesselMarkers() async {
    if (mapboxMap == null) return;

    final provider = Provider.of<VesselProvider>(context, listen: false);

    try {
      // Clear existing annotations first
      final pointAnnotationManager = await mapboxMap!.annotations.createPointAnnotationManager();

      for (var vesselData in provider.vesselsInPark) {
        final vessel = vesselData['vessel'] as Vessel;
        final lat = vesselData['latitude'] as double;
        final lon = vesselData['longitude'] as double;
        final isInPark = vesselData['is_in_park'] as bool;

        final pointAnnotation = PointAnnotationOptions(
          geometry: Point(coordinates: Position(lon, lat)),
          textField: vessel.name,
          textSize: 12.0,
          textColor: isInPark ? Colors.red.value : Colors.blue.value,
          textOffset: [0.0, -2.0],
          iconSize: 1.0,
        );

        await pointAnnotationManager.create(pointAnnotation);
      }
    } catch (e) {
      print('Error adding vessel markers: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vessel Tracker'),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await _loadData();
              await _setupMap(); // Refresh the map
            },
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearchDialog(context),
          ),
        ],
      ),
      body: Stack(
        children: [
          MapWidget(
            key: const ValueKey("mapWidget"),
            onMapCreated: _onMapCreated,
          ),
          Consumer<VesselProvider>(
            builder: (context, provider, child) {
              if (provider.isLoading) {
                return const Positioned(
                  top: 100,
                  left: 20,
                  right: 20,
                  child: Card(
                    child: Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(width: 16),
                          Text('Loading vessel data...'),
                        ],
                      ),
                    ),
                  ),
                );
              }

              if (provider.error != null) {
                return Positioned(
                  top: 100,
                  left: 20,
                  right: 20,
                  child: Card(
                    color: Colors.red[100],
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Error: ${provider.error}',
                            style: const TextStyle(color: Colors.red),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: () {
                              provider.clearError();
                              _loadData();
                            },
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return Positioned(
                bottom: 20,
                left: 20,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'La Maddalena National Park',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.blue[800],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Vessels Tracked: ${provider.vesselsInPark.length}',
                          style: const TextStyle(fontSize: 14),
                        ),
                        Text(
                          'In Park: ${provider.vesselsInPark.where((v) => v['is_in_park'] == true).length}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Icon(Icons.circle, color: Colors.green, size: 12),
                            SizedBox(width: 4),
                            Text('Park Boundary', style: TextStyle(fontSize: 12)),
                            SizedBox(width: 16),
                            Icon(Icons.circle, color: Colors.red, size: 12),
                            SizedBox(width: 4),
                            Text('Inside Park', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                        const Row(
                          children: [
                            Icon(Icons.circle, color: Colors.blue, size: 12),
                            SizedBox(width: 4),
                            Text('Outside Park', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showVesselList(context),
        backgroundColor: Colors.blue[800],
        child: const Icon(Icons.list, color: Colors.white),
      ),
    );
  }

  void _showSearchDialog(BuildContext context) {
    String? vesselName;
    String? vesselType;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Search Vessels'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Vessel Name',
                  hintText: 'Enter vessel name',
                ),
                onChanged: (value) => vesselName = value,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: 'Vessel Type'),
                items: const [
                  DropdownMenuItem(value: null, child: Text('All')),
                  DropdownMenuItem(value: 'Cargo', child: Text('Cargo')),
                  DropdownMenuItem(value: 'Tanker', child: Text('Tanker')),
                  DropdownMenuItem(value: 'Passenger', child: Text('Passenger')),
                  DropdownMenuItem(value: 'Fishing', child: Text('Fishing')),
                ],
                onChanged: (value) => vesselType = value,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final provider = Provider.of<VesselProvider>(context, listen: false);
                provider.searchVessels(name: vesselName, type: vesselType);
                Navigator.of(context).pop();
              },
              child: const Text('Search'),
            ),
          ],
        );
      },
    );
  }

  void _showVesselList(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return Consumer<VesselProvider>(
          builder: (context, provider, child) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.6,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Vessel Details',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (provider.vesselsInPark.isEmpty)
                    const Expanded(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.sailing, size: 64, color: Colors.grey),
                            SizedBox(height: 16),
                            Text(
                              'No vessels found',
                              style: TextStyle(fontSize: 18, color: Colors.grey),
                            ),
                            Text(
                              'Check your API configuration',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    Expanded(
                      child: ListView.builder(
                        itemCount: provider.vesselsInPark.length,
                        itemBuilder: (context, index) {
                          final vesselData = provider.vesselsInPark[index];
                          final vessel = vesselData['vessel'] as Vessel;
                          final lat = vesselData['latitude'] as double;
                          final lon = vesselData['longitude'] as double;
                          final isInPark = vesselData['is_in_park'] as bool;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Icon(
                                Icons.directions_boat,
                                color: isInPark ? Colors.red : Colors.blue,
                                size: 32,
                              ),
                              title: Text(
                                vessel.name,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${vessel.type} - ${vessel.countryName}'),
                                  Text('MMSI: ${vessel.mmsi}'),
                                  Text(
                                    'Position: ${lat.toStringAsFixed(4)}, ${lon.toStringAsFixed(4)}',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ],
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: isInPark ? Colors.red : Colors.blue,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  isInPark ? 'IN PARK' : 'NEARBY',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              onTap: () async {
                                // Center map on selected vessel
                                if (mapboxMap != null) {
                                  await mapboxMap!.setCamera(CameraOptions(
                                    center: Point(coordinates: Position(lon, lat)),
                                    zoom: 15.0,
                                  ));
                                  Navigator.of(context).pop();
                                }
                              },
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}