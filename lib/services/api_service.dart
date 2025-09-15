import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import '../models/vessel.dart';

class ApiService {
  late final String baseUrl;

  ApiService() {
    baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:8080';
  }

  Future<List<Map<String, dynamic>>> getVesselsInPark() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/vessels/in-park'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final vesselsInPark = data['vessels_in_park'] as List<dynamic>? ?? [];

        return vesselsInPark.map((item) {
          final vesselData = item['vessel'] as Map<String, dynamic>;
          final position = item['position'] as Map<String, dynamic>;

          return {
            'vessel': Vessel.fromJson(vesselData),
            'latitude': position['latitude'],
            'longitude': position['longitude'],
            'is_in_park': item['is_in_park'] ?? false,
          };
        }).toList();
      } else {
        throw Exception('Failed to load vessels: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching vessels in park: $e');
      return [];
    }
  }

  Future<List<Vessel>> searchVessels({
    String? name,
    String? type,
    String? countryIso,
    int maxResults = 500,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (name != null) queryParams['name'] = name;
      if (type != null) queryParams['type'] = type;
      if (countryIso != null) queryParams['country_iso'] = countryIso;
      queryParams['max_results'] = maxResults.toString();

      final uri = Uri.parse('$baseUrl/api/vessels')
          .replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final vessels = data['vessels'] as List<dynamic>? ?? [];
        return vessels.map((v) => Vessel.fromJson(v)).toList();
      } else {
        throw Exception('Failed to search vessels: ${response.statusCode}');
      }
    } catch (e) {
      print('Error searching vessels: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getParkBoundaries() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/park-boundaries'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load park boundaries: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching park boundaries: $e');
      return null;
    }
  }

  Future<bool> checkHealth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/health'),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Health check failed: $e');
      return false;
    }
  }
}