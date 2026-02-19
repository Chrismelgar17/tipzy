import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { Ticket, Order, Product } from '@/types/models';
import { useAuth } from '@/hooks/auth-context';
import { safeJsonParse, clearCorruptedData, clearAllAppData } from '@/utils/storage';

interface TicketsState {
  tickets: Ticket[];
  orders: Order[];
  isLoading: boolean;
  purchaseTickets: (eventId: string, eventTitle: string, venueName: string, venueAddress: string, eventDate: Date, items: { product: Product; qty: number }[]) => Promise<Order>;
  getTicketsByEvent: (eventId: string) => Ticket[];
  validateTicket: (qrCode: string) => Promise<{ valid: boolean; ticket?: Ticket }>;
  checkInTicket: (ticketId: string) => Promise<void>;
}

export const [TicketsProvider, useTickets] = createContextHook<TicketsState>(() => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTickets();
    } else {
      setTickets([]);
      setOrders([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadTickets = async () => {
    try {
      const [storedTickets, storedOrders] = await Promise.all([
        AsyncStorage.getItem(`tickets_${user?.id}`),
        AsyncStorage.getItem(`orders_${user?.id}`),
      ]);
      
      // Handle corrupted data
      if (storedTickets && (storedTickets.startsWith('object') || storedTickets.includes('Unexpected character'))) {
        console.warn('Detected corrupted tickets data, clearing storage');
        await clearCorruptedData(`tickets_${user?.id}`);
        setTickets([]);
      } else {
        const parsedTickets = safeJsonParse<Ticket[]>(storedTickets, []);
        if (Array.isArray(parsedTickets)) {
          setTickets(parsedTickets);
        } else if (storedTickets && storedTickets.trim()) {
          console.warn('Invalid tickets data format, clearing storage');
          await clearCorruptedData(`tickets_${user?.id}`);
          setTickets([]);
        }
      }
      
      if (storedOrders && (storedOrders.startsWith('object') || storedOrders.includes('Unexpected character'))) {
        console.warn('Detected corrupted orders data, clearing storage');
        await clearCorruptedData(`orders_${user?.id}`);
        setOrders([]);
      } else {
        const parsedOrders = safeJsonParse<Order[]>(storedOrders, []);
        if (Array.isArray(parsedOrders)) {
          setOrders(parsedOrders);
        } else if (storedOrders && storedOrders.trim()) {
          console.warn('Invalid orders data format, clearing storage');
          await clearCorruptedData(`orders_${user?.id}`);
          setOrders([]);
        }
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
      // Reset to safe state
      setTickets([]);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseTickets = async (
    eventId: string,
    eventTitle: string,
    venueName: string,
    venueAddress: string,
    eventDate: Date,
    items: { product: Product; qty: number }[]
  ): Promise<Order> => {
    if (!user) throw new Error('User not authenticated');

    const orderId = `order_${Date.now()}`;
    const orderItems = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      qty: item.qty,
      unitPrice: item.product.price,
    }));

    const order: Order = {
      id: orderId,
      userId: user.id,
      eventId,
      items: orderItems,
      amountTotal: items.reduce((sum, item) => sum + item.product.price * item.qty, 0),
      currency: 'USD',
      status: 'paid',
      createdAt: new Date(),
    };

    const newTickets: Ticket[] = [];
    for (const item of items) {
      for (let i = 0; i < item.qty; i++) {
        const ticket: Ticket = {
          id: `ticket_${Date.now()}_${i}`,
          orderId,
          userId: user.id,
          eventId,
          eventTitle,
          venueName,
          productId: item.product.id,
          productName: item.product.name,
          qrCode: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'valid',
          eventDate,
          venueAddress,
        };
        newTickets.push(ticket);
      }
    }

    const updatedTickets = [...tickets, ...newTickets];
    const updatedOrders = [...orders, order];

    setTickets(updatedTickets);
    setOrders(updatedOrders);

    await Promise.all([
      AsyncStorage.setItem(`tickets_${user.id}`, JSON.stringify(updatedTickets)),
      AsyncStorage.setItem(`orders_${user.id}`, JSON.stringify(updatedOrders)),
    ]);

    return order;
  };

  const getTicketsByEvent = (eventId: string): Ticket[] => {
    return tickets.filter(ticket => ticket.eventId === eventId);
  };

  const validateTicket = async (qrCode: string): Promise<{ valid: boolean; ticket?: Ticket }> => {
    const ticket = tickets.find(t => t.qrCode === qrCode);
    if (!ticket) return { valid: false };
    if (ticket.status !== 'valid') return { valid: false, ticket };
    return { valid: true, ticket };
  };

  const checkInTicket = async (ticketId: string): Promise<void> => {
    const updatedTickets = tickets.map(ticket =>
      ticket.id === ticketId
        ? { ...ticket, status: 'used' as const, checkedInAt: new Date() }
        : ticket
    );
    
    setTickets(updatedTickets);
    await AsyncStorage.setItem(`tickets_${user?.id}`, JSON.stringify(updatedTickets));
  };

  return {
    tickets,
    orders,
    isLoading,
    purchaseTickets,
    getTicketsByEvent,
    validateTicket,
    checkInTicket,
  };
});