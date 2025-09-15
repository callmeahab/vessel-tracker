class Vessel {
  final String uuid;
  final String name;
  final String nameAis;
  final String mmsi;
  final String imo;
  final String? eni;
  final String countryIso;
  final String countryName;
  final String callsign;
  final String type;
  final String typeSpecific;
  final int? grossTonnage;
  final int? deadweight;
  final double length;
  final double breadth;
  final String? yearBuilt;
  final bool isNavaid;
  final String? homePort;

  // Position data
  final double? latitude;
  final double? longitude;
  final bool? isInPark;
  final String? lastUpdated;

  Vessel({
    required this.uuid,
    required this.name,
    required this.nameAis,
    required this.mmsi,
    required this.imo,
    this.eni,
    required this.countryIso,
    required this.countryName,
    required this.callsign,
    required this.type,
    required this.typeSpecific,
    this.grossTonnage,
    this.deadweight,
    required this.length,
    required this.breadth,
    this.yearBuilt,
    required this.isNavaid,
    this.homePort,
    this.latitude,
    this.longitude,
    this.isInPark,
    this.lastUpdated,
  });

  factory Vessel.fromJson(Map<String, dynamic> json) {
    return Vessel(
      uuid: json['uuid'] ?? '',
      name: json['name'] ?? '',
      nameAis: json['name_ais'] ?? '',
      mmsi: json['mmsi'] ?? '',
      imo: json['imo'] ?? '',
      eni: json['eni'],
      countryIso: json['country_iso'] ?? '',
      countryName: json['country_name'] ?? '',
      callsign: json['callsign'] ?? '',
      type: json['type'] ?? '',
      typeSpecific: json['type_specific'] ?? '',
      grossTonnage: json['gross_tonnage'],
      deadweight: json['deadweight'],
      length: (json['length'] ?? 0).toDouble(),
      breadth: (json['breadth'] ?? 0).toDouble(),
      yearBuilt: json['year_built'],
      isNavaid: json['is_navaid'] ?? false,
      homePort: json['home_port'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      isInPark: json['is_in_park'],
      lastUpdated: json['last_updated'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uuid': uuid,
      'name': name,
      'name_ais': nameAis,
      'mmsi': mmsi,
      'imo': imo,
      'eni': eni,
      'country_iso': countryIso,
      'country_name': countryName,
      'callsign': callsign,
      'type': type,
      'type_specific': typeSpecific,
      'gross_tonnage': grossTonnage,
      'deadweight': deadweight,
      'length': length,
      'breadth': breadth,
      'year_built': yearBuilt,
      'is_navaid': isNavaid,
      'home_port': homePort,
      'latitude': latitude,
      'longitude': longitude,
      'is_in_park': isInPark,
      'last_updated': lastUpdated,
    };
  }
}

class VesselPosition {
  final String vesselId;
  final double latitude;
  final double longitude;
  final bool isInPark;

  VesselPosition({
    required this.vesselId,
    required this.latitude,
    required this.longitude,
    required this.isInPark,
  });
}