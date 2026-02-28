import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../services/mosque_service.dart';

/// Admin mosque management screen.
class MosquesScreen extends ConsumerStatefulWidget {
  const MosquesScreen({super.key});

  @override
  ConsumerState<MosquesScreen> createState() => _MosquesScreenState();
}

class _MosquesScreenState extends ConsumerState<MosquesScreen> {
  List<Mosque> _mosques = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      _mosques = await ref.read(mosqueServiceProvider).getMosques();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  void _showForm({Mosque? mosque}) {
    final nameCtrl = TextEditingController(text: mosque?.name ?? '');
    final addressCtrl = TextEditingController(text: mosque?.address ?? '');
    final phoneCtrl = TextEditingController(text: mosque?.phone ?? '');
    final emailCtrl = TextEditingController(text: mosque?.email ?? '');
    bool isEdit = mosque != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: 20 + MediaQuery.of(ctx).viewInsets.bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.stone300,
                  borderRadius: BorderRadius.circular(2),
                ),
              )),
              const SizedBox(height: 16),
              Text(isEdit ? 'Edit Mosque' : 'Add Mosque',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Name *'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: addressCtrl,
                decoration: const InputDecoration(labelText: 'Address'),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: phoneCtrl,
                decoration: const InputDecoration(labelText: 'Phone'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: emailCtrl,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    if (nameCtrl.text.trim().isEmpty) return;
                    try {
                      final service = ref.read(mosqueServiceProvider);
                      final data = {
                        'name': nameCtrl.text.trim(),
                        'address': addressCtrl.text.trim(),
                        'phone': phoneCtrl.text.trim(),
                        'email': emailCtrl.text.trim(),
                      };
                      if (isEdit) {
                        await service.updateMosque(mosque!.id!, data);
                      } else {
                        await service.createMosque(data);
                      }
                      if (mounted) {
                        Navigator.of(ctx).pop();
                        _load();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                                isEdit ? 'Mosque updated' : 'Mosque created'),
                            backgroundColor: AppColors.emerald,
                          ),
                        );
                      }
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text('Error: $e'),
                            backgroundColor: AppColors.error),
                      );
                    }
                  },
                  child: Text(isEdit ? 'Save Changes' : 'Create Mosque'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mosques'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showForm(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _mosques.isEmpty
                  ? const Center(child: Text('No mosques found'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _mosques.length,
                      itemBuilder: (ctx, i) {
                        final m = _mosques[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: AppColors.emerald,
                              child: Icon(Icons.mosque,
                                  color: Colors.white, size: 20),
                            ),
                            title: Text(m.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (m.address != null && m.address!.isNotEmpty)
                                  Text(m.address!,
                                      style: const TextStyle(fontSize: 12)),
                                if (m.phone != null && m.phone!.isNotEmpty)
                                  Text(m.phone!,
                                      style: const TextStyle(fontSize: 12)),
                              ],
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit, size: 18),
                              onPressed: () => _showForm(mosque: m),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
