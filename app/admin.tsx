import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Eye,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-context';
import { useTickets } from '@/hooks/tickets-context';
import { mockEvents, mockVenues } from '@/mocks/venues';
import { Venue } from '@/types/models';
import api from '@/lib/api';

type PendingBusiness = {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  businessStatus: string | null;
  createdAt: string;
};

export default function AdminScreen() {
  const { user } = useAuth();
  const { tickets, orders } = useTickets();
  const [venues, setVenues] = useState<Venue[]>(mockVenues);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showCrowdUpdate, setShowCrowdUpdate] = useState(false);
  const [newVenue, setNewVenue] = useState<Partial<Venue>>({
    name: '',
    address: '',
    capacity: 100,
    crowdCount: 0,
    minAge: 21,
    dressCode: 'Casual',
    genres: [],
    priceLevel: 2,
  });

  // Business requests
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null);

  // Featured rank editing
  const [apiVenues, setApiVenues] = useState<{ id: string; name: string; address: string; status: string; featured_rank: number }[]>([]);
  const [showRankModal, setShowRankModal] = useState(false);
  const [rankVenue, setRankVenue] = useState<{ id: string; name: string; featured_rank: number } | null>(null);
  const [newRank, setNewRank] = useState('');

  // Mock analytics data
  const analytics = {
    totalRevenue: orders.reduce((sum, order) => sum + order.amountTotal, 0),
    totalTicketsSold: tickets.length,
    totalEvents: mockEvents.length,
    totalVenues: mockVenues.length,
    conversionRate: 0.68,
    avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.amountTotal, 0) / orders.length : 0,
  };

  // Fetch pending business requests on mount
  useEffect(() => {
    void fetchPendingBusinesses();
    void fetchApiVenues();
  }, []);

  const fetchApiVenues = async () => {
    try {
      const res = await api.get('/admin/venues');
      setApiVenues(res.data.venues ?? []);
    } catch (err) {
      console.warn('[Admin] Could not load venues:', err);
    }
  };

  const fetchPendingBusinesses = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get('/admin/users');
      const all = (res.data.users ?? []) as PendingBusiness[];
      setPendingBusinesses(all.filter(u => u.businessStatus === 'pending'));
    } catch (err) {
      console.error('[Admin] Failed to fetch business requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveBusiness = (id: string) => {
    Alert.alert('Approve Business', 'Approve this business? The owner will be notified by email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.patch(`/admin/business/${id}/approve`);
            setPendingBusinesses(prev => prev.filter(b => b.id !== id));
            Alert.alert('✅ Approved', 'Business approved. The owner has been notified by email.');
          } catch {
            Alert.alert('Error', 'Could not approve. Please try again.');
          }
        },
      },
    ]);
  };

  const openRejectModal = (id: string) => {
    setSelectedRejectId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRejectId) return;
    try {
      await api.patch(`/admin/business/${selectedRejectId}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      setPendingBusinesses(prev => prev.filter(b => b.id !== selectedRejectId));
      setShowRejectModal(false);
      setSelectedRejectId(null);
      Alert.alert('Rejected', 'Business rejected. The owner has been notified by email.');
    } catch {
      Alert.alert('Error', 'Could not reject. Please try again.');
    }
  };

  const handleSaveRank = async () => {
    if (!rankVenue) return;
    const rank = parseInt(newRank, 10);
    if (isNaN(rank) || rank < 0) {
      Alert.alert('Invalid', 'Enter a number ≥ 0 (0 = not featured)');
      return;
    }
    try {
      await api.patch(`/admin/venues/${rankVenue.id}/featured-rank`, { featuredRank: rank });
      setApiVenues(prev => prev.map(v => v.id === rankVenue.id ? { ...v, featured_rank: rank } : v));
      setShowRankModal(false);
      Alert.alert('✅ Updated', `"${rankVenue.name}" rank set to ${rank}`);
    } catch {
      Alert.alert('Error', 'Failed to update rank. Please try again.');
    }
  };

  const statsCards = [
    {
      title: 'Total Revenue',
      value: `$${analytics.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: theme.colors.success,
      change: '+12.5%',
    },
    {
      title: 'Tickets Sold',
      value: analytics.totalTicketsSold.toString(),
      icon: Users,
      color: theme.colors.purple,
      change: '+8.2%',
    },
    {
      title: 'Active Events',
      value: analytics.totalEvents.toString(),
      icon: Calendar,
      color: theme.colors.cyan,
      change: '+3',
    },
    {
      title: 'Conversion Rate',
      value: `${(analytics.conversionRate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: theme.colors.warning,
      change: '+2.1%',
    },
  ];

  const handleAddVenue = () => {
    if (!newVenue.name || !newVenue.address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const venue: Venue = {
      id: Date.now().toString(),
      name: newVenue.name!,
      photos: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800'],
      address: newVenue.address!,
      geo: { lat: 41.6528 + Math.random() * 0.01, lng: -83.5379 + Math.random() * 0.01 },
      timezone: 'America/New_York',
      hours: {
        fri: { open: '20:00', close: '02:00' },
        sat: { open: '20:00', close: '02:00' },
      },
      minAge: newVenue.minAge || 21,
      dressCode: newVenue.dressCode || 'Casual',
      capacity: newVenue.capacity || 100,
      crowdCount: newVenue.crowdCount || 0,
      crowdLevel: 'quiet',
      genres: newVenue.genres || ['Music'],
      featuredRank: venues.length + 1,
      ownerUserId: user?.id || 'admin',
      createdAt: new Date(),
      priceLevel: newVenue.priceLevel || 2,
      distance: Math.random() * 2,
      closingTime: '2:00 AM',
    };

    setVenues([...venues, venue]);
    setNewVenue({ name: '', address: '', capacity: 100, crowdCount: 0, minAge: 21, dressCode: 'Casual', genres: [], priceLevel: 2 });
    setShowAddVenue(false);
    Alert.alert('Success', 'Venue added successfully!');
  };

  const handleUpdateCrowd = (venueId: string, newCount: number) => {
    setVenues(venues.map(venue => 
      venue.id === venueId 
        ? { 
            ...venue, 
            crowdCount: newCount,
            crowdLevel: newCount >= 100 ? 'packed' : newCount >= 50 ? 'busy' : 'quiet'
          }
        : venue
    ));
  };

  const handleDeleteVenue = (venueId: string) => {
    Alert.alert(
      'Delete Venue',
      'Are you sure you want to delete this venue? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setVenues(venues.filter(v => v.id !== venueId));
            Alert.alert('Success', 'Venue deleted successfully!');
          },
        },
      ]
    );
  };

  const quickActions = [
    {
      title: 'Add Venue',
      icon: Plus,
      color: theme.colors.purple,
      onPress: () => setShowAddVenue(true),
    },
    {
      title: 'Update Crowds',
      icon: Users,
      color: theme.colors.cyan,
      onPress: () => setShowCrowdUpdate(true),
    },
    {
      title: 'View Analytics',
      icon: BarChart3,
      color: theme.colors.success,
      onPress: () => Alert.alert('Analytics', 'Analytics dashboard coming soon!'),
    },
    {
      title: 'View Reports',
      icon: Eye,
      color: theme.colors.warning,
      onPress: () => Alert.alert('Reports', 'Reports dashboard coming soon!'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <View key={index} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                    <Icon size={20} color={theme.colors.white} />
                  </View>
                  <Text style={[styles.statChange, { color: stat.color }]}>
                    {stat.change}
                  </Text>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
              </View>
            );
          })}
        </View>

        {/* Business Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Business Requests</Text>
            <TouchableOpacity onPress={fetchPendingBusinesses} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingRequests ? (
            <ActivityIndicator color={theme.colors.purple} style={{ marginVertical: 16 }} />
          ) : pendingBusinesses.length === 0 ? (
            <View style={styles.emptyRequests}>
              <Text style={styles.emptyRequestsText}>No pending business requests</Text>
            </View>
          ) : (
            pendingBusinesses.map(biz => (
              <View key={biz.id} style={styles.businessRequestCard}>
                <View style={styles.bizInfo}>
                  <Text style={styles.bizName}>{biz.businessName ?? biz.name}</Text>
                  <Text style={styles.bizEmail}>{biz.email}</Text>
                  <Text style={styles.bizDate}>
                    Registered: {new Date(biz.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.bizActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApproveBusiness(biz.id)}
                  >
                    <CheckCircle2 size={15} color={theme.colors.white} />
                    <Text style={styles.bizActionText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => openRejectModal(biz.id)}
                  >
                    <XCircle size={15} color={theme.colors.white} />
                    <Text style={styles.bizActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
        {/* Venue Featured Ranks */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Venue Featured Ranks</Text>
            <TouchableOpacity onPress={fetchApiVenues} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {apiVenues.length === 0 ? (
            <View style={styles.emptyRequests}>
              <Text style={styles.emptyRequestsText}>No venues found</Text>
            </View>
          ) : (
            apiVenues.map(v => (
              <View key={v.id} style={styles.businessRequestCard}>
                <View style={styles.bizInfo}>
                  <Text style={styles.bizName}>{v.name}</Text>
                  <Text style={styles.bizEmail}>{v.address || 'No address'}</Text>
                  <Text style={[styles.bizDate, { color: v.featured_rank > 0 ? theme.colors.purple : theme.colors.text.tertiary }]}>
                    Featured rank: {v.featured_rank} {v.featured_rank === 0 ? '(not featured)' : '⭐'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => { setRankVenue(v); setNewRank(String(v.featured_rank)); setShowRankModal(true); }}
                >
                  <Edit3 size={14} color={theme.colors.white} />
                  <Text style={styles.bizActionText}>Set Rank</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  onPress={action.onPress}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                    <Icon size={24} color={theme.colors.white} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Venue Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Management</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.venueList}>
              {venues.map((venue) => (
                <View key={venue.id} style={styles.venueCard}>
                  <View style={styles.venueHeader}>
                    <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                    <View style={styles.venueActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteVenue(venue.id)}
                      >
                        <Trash2 size={14} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.venueAddress} numberOfLines={2}>{venue.address}</Text>
                  <View style={styles.venueStats}>
                    <Text style={styles.venueStat}>Capacity: {venue.capacity}</Text>
                    <Text style={[styles.venueStat, { color: venue.crowdCount >= 100 ? theme.colors.error : venue.crowdCount >= 50 ? theme.colors.warning : theme.colors.success }]}>
                      Current: {venue.crowdCount}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Add Venue Modal */}
      <Modal visible={showAddVenue} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Venue</Text>
              <TouchableOpacity onPress={() => setShowAddVenue(false)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Venue Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newVenue.name}
                  onChangeText={(text) => setNewVenue({...newVenue, name: text})}
                  placeholder="Enter venue name"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newVenue.address}
                  onChangeText={(text) => setNewVenue({...newVenue, address: text})}
                  placeholder="Enter venue address"
                  placeholderTextColor={theme.colors.text.tertiary}
                  multiline
                />
              </View>
              
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Capacity</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newVenue.capacity?.toString()}
                    onChangeText={(text) => setNewVenue({...newVenue, capacity: parseInt(text) || 0})}
                    placeholder="100"
                    placeholderTextColor={theme.colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Min Age</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newVenue.minAge?.toString()}
                    onChangeText={(text) => setNewVenue({...newVenue, minAge: parseInt(text) || 21})}
                    placeholder="21"
                    placeholderTextColor={theme.colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddVenue(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddVenue}>
                <Save size={16} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Add Venue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Crowd Update Modal */}
      <Modal visible={showCrowdUpdate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Crowd Counts</Text>
              <TouchableOpacity onPress={() => setShowCrowdUpdate(false)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {venues.map((venue) => (
                <View key={venue.id} style={styles.crowdUpdateItem}>
                  <View style={styles.crowdUpdateInfo}>
                    <Text style={styles.crowdUpdateName}>{venue.name}</Text>
                    <Text style={styles.crowdUpdateCapacity}>Capacity: {venue.capacity}</Text>
                  </View>
                  <View style={styles.crowdUpdateControls}>
                    <TextInput
                      style={styles.crowdInput}
                      value={venue.crowdCount.toString()}
                      onChangeText={(text) => {
                        const count = parseInt(text) || 0;
                        handleUpdateCrowd(venue.id, count);
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.text.tertiary}
                    />
                    <View style={[
                      styles.crowdIndicator,
                      { backgroundColor: venue.crowdCount >= 100 ? theme.colors.error : venue.crowdCount >= 50 ? theme.colors.warning : theme.colors.success }
                    ]} />
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.doneButton} onPress={() => setShowCrowdUpdate(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Business Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Business</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Reason for rejection (optional)</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g. Incomplete information, venue not eligible..."
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
              />
              <Text style={styles.rejectNote}>
                The business owner will be notified by email with this reason.
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRejectModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.error }]}
                onPress={confirmReject}
              >
                <XCircle size={16} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Featured Rank Modal */}
      <Modal visible={showRankModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Featured Rank</Text>
              <TouchableOpacity onPress={() => setShowRankModal(false)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.bizName}>{rankVenue?.name}</Text>
              <Text style={[styles.bizEmail, { marginBottom: 12 }]}>
                0 = not featured · 1 = highest priority · higher number = lower priority
              </Text>
              <Text style={styles.inputLabel}>Featured Rank</Text>
              <TextInput
                style={styles.textInput}
                value={newRank}
                onChangeText={setNewRank}
                keyboardType="numeric"
                placeholder="e.g. 1"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRankModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveRank}>
                <Save size={16} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Save Rank</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: '47%',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    width: '47%',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  venueList: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingRight: theme.spacing.lg,
  },
  venueCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  venueActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
  venueAddress: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 16,
  },
  venueStats: {
    gap: 4,
  },
  venueStat: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: theme.spacing.lg,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.purple,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  crowdUpdateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  crowdUpdateInfo: {
    flex: 1,
  },
  crowdUpdateName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  crowdUpdateCapacity: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  crowdUpdateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  crowdInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text.primary,
    width: 60,
    textAlign: 'center',
  },
  crowdIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  doneButton: {
    backgroundColor: theme.colors.purple,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  doneButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  businessRequestCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bizInfo: {
    marginBottom: theme.spacing.sm,
  },
  bizName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 3,
  },
  bizEmail: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 3,
  },
  bizDate: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  bizActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  bizActionText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyRequests: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyRequestsText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
  },
  rejectNote: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    lineHeight: 16,
  },
});