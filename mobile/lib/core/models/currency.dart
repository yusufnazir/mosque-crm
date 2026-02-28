/// Currency model matching CurrencyDTO.
class Currency {
  final int id;
  final String code;
  final String name;
  final String symbol;
  final int decimalPlaces;

  Currency({
    required this.id,
    required this.code,
    required this.name,
    required this.symbol,
    this.decimalPlaces = 2,
  });

  factory Currency.fromJson(Map<String, dynamic> json) {
    return Currency(
      id: json['id'] as int,
      code: json['code'] as String,
      name: json['name'] as String,
      symbol: json['symbol'] as String,
      decimalPlaces: json['decimalPlaces'] as int? ?? 2,
    );
  }
}
