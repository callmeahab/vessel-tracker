import 'package:flutter/material.dart';
import '../models/vessel.dart';
import '../services/api_service.dart';

class VesselProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Map<String, dynamic>> _vesselsInPark = [];
  List<Vessel> _allVessels = [];
  Map<String, dynamic>? _parkBoundaries;
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get vesselsInPark => _vesselsInPark;
  List<Vessel> get allVessels => _allVessels;
  Map<String, dynamic>? get parkBoundaries => _parkBoundaries;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchVesselsInPark() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _vesselsInPark = await _apiService.getVesselsInPark();
      _error = null;
    } catch (e) {
      _error = e.toString();
      print('Error in fetchVesselsInPark: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> searchVessels({
    String? name,
    String? type,
    String? countryIso,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _allVessels = await _apiService.searchVessels(
        name: name,
        type: type,
        countryIso: countryIso,
      );
      _error = null;
    } catch (e) {
      _error = e.toString();
      print('Error in searchVessels: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchParkBoundaries() async {
    try {
      _parkBoundaries = await _apiService.getParkBoundaries();
      notifyListeners();
    } catch (e) {
      print('Error fetching park boundaries: $e');
    }
  }

  Future<bool> checkApiHealth() async {
    return await _apiService.checkHealth();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}