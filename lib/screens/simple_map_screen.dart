import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/vessel_provider.dart';
import '../models/vessel.dart';

class SimpleMapScreen extends StatefulWidget {
  const SimpleMapScreen({Key? key}) : super(key: key);

  @override
  State<SimpleMapScreen> createState() => _SimpleMapScreenState();
}

class _SimpleMapScreenState extends State<SimpleMapScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<VesselProvider>(context, listen: false);
    await provider.fetchParkBoundaries();
    await provider.fetchVesselsInPark();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vessel Tracker'),
        backgroundColor: Colors.blue[800],
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearchDialog(context),
          ),
        ],
      ),
      body: Consumer<VesselProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading vessel data...'),
                ],
              ),
            );
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error: ${provider.error}',
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      provider.clearError();
                      _loadData();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              // Status Card
              Card(
                margin: const EdgeInsets.all(16),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Column(
                        children: [
                          Icon(Icons.park, color: Colors.green[700], size: 32),
                          const SizedBox(height: 8),
                          const Text(
                            'La Maddalena\nNational Park',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Column(
                        children: [
                          Icon(Icons.directions_boat,
                              color: Colors.blue[700], size: 32),
                          const SizedBox(height: 8),
                          Text(
                            '${provider.vesselsInPark.length}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Text('Vessels Tracked'),
                        ],
                      ),
                      Column(
                        children: [
                          Icon(Icons.warning, color: Colors.orange[700], size: 32),
                          const SizedBox(height: 8),
                          Text(
                            '${provider.vesselsInPark.where((v) => v['is_in_park'] == true).length}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.red,
                            ),
                          ),
                          const Text('In Park'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              // Vessels List
              Expanded(
                child: provider.vesselsInPark.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.sailing,
                              size: 64,
                              color: Colors.grey,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'No vessels found',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey,
                              ),
                            ),
                            Text(
                              'Make sure your API key is configured',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
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
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${vessel.type} - ${vessel.countryName}'),
                                  Text('MMSI: ${vessel.mmsi}'),
                                  Text(
                                    'Position: ${lat.toStringAsFixed(4)}, ${lon.toStringAsFixed(4)}',
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
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadData,
        backgroundColor: Colors.blue[800],
        child: const Icon(Icons.refresh),
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
                final provider =
                    Provider.of<VesselProvider>(context, listen: false);
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
}