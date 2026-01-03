package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"
)

type RabbitMQ struct {
	conn         *amqp.Connection
	channel      *amqp.Channel
	exchangeName string
	consumeQueue string
	publishQueue string
}

// NewRabbitMQ creates a new RabbitMQ connection
func NewRabbitMQ(url, exchangeName, consumeQueue, publishQueue string) (*RabbitMQ, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	rmq := &RabbitMQ{
		conn:         conn,
		channel:      ch,
		exchangeName: exchangeName,
		consumeQueue: consumeQueue,
		publishQueue: publishQueue,
	}

	// Setup exchange and queues
	if err := rmq.setup(); err != nil {
		rmq.Close()
		return nil, err
	}

	log.Info().Msg("✅ RabbitMQ connected")
	return rmq, nil
}

// setup creates exchange and queues
func (r *RabbitMQ) setup() error {
	// Declare exchange
	err := r.channel.ExchangeDeclare(
		r.exchangeName, // name
		"direct",       // type
		true,           // durable
		false,          // auto-deleted
		false,          // internal
		false,          // no-wait
		nil,            // arguments
	)
	if err != nil {
		return fmt.Errorf("failed to declare exchange: %w", err)
	}

	// Declare consume queue (for receiving analyze requests)
	_, err = r.channel.QueueDeclare(
		r.consumeQueue, // name
		true,           // durable
		false,          // delete when unused
		false,          // exclusive
		false,          // no-wait
		amqp.Table{
			"x-dead-letter-exchange": r.exchangeName + ".dlx",
		},
	)
	if err != nil {
		return fmt.Errorf("failed to declare consume queue: %w", err)
	}

	// Bind consume queue to exchange
	err = r.channel.QueueBind(
		r.consumeQueue,
		r.consumeQueue, // routing key
		r.exchangeName,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to bind consume queue: %w", err)
	}

	// Declare publish queue (for sending analyzed signals)
	_, err = r.channel.QueueDeclare(
		r.publishQueue,
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare publish queue: %w", err)
	}

	// Bind publish queue to exchange
	err = r.channel.QueueBind(
		r.publishQueue,
		r.publishQueue,
		r.exchangeName,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to bind publish queue: %w", err)
	}

	// Setup Dead Letter Exchange
	err = r.channel.ExchangeDeclare(
		r.exchangeName+".dlx",
		"direct",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare DLX: %w", err)
	}

	// DLQ
	_, err = r.channel.QueueDeclare(
		r.consumeQueue+".dlq",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare DLQ: %w", err)
	}

	log.Info().
		Str("exchange", r.exchangeName).
		Str("consumeQueue", r.consumeQueue).
		Str("publishQueue", r.publishQueue).
		Msg("RabbitMQ setup complete")

	return nil
}

// Consume starts consuming messages from the consume queue
func (r *RabbitMQ) Consume() (<-chan amqp.Delivery, error) {
	// Set QoS - process one message at a time
	err := r.channel.Qos(
		1,     // prefetch count
		0,     // prefetch size
		false, // global
	)
	if err != nil {
		return nil, fmt.Errorf("failed to set QoS: %w", err)
	}

	msgs, err := r.channel.Consume(
		r.consumeQueue,
		"",    // consumer tag
		false, // auto-ack (manual ack for reliability)
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register consumer: %w", err)
	}

	log.Info().Str("queue", r.consumeQueue).Msg("Started consuming messages")
	return msgs, nil
}

// Publish sends a message to the publish queue
func (r *RabbitMQ) Publish(ctx context.Context, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err = r.channel.PublishWithContext(
		ctx,
		r.exchangeName, // exchange
		r.publishQueue, // routing key
		false,          // mandatory
		false,          // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
			Timestamp:    time.Now(),
		},
	)
	if err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	log.Debug().Str("queue", r.publishQueue).Msg("Message published")
	return nil
}

// Close closes the RabbitMQ connection
func (r *RabbitMQ) Close() {
	if r.channel != nil {
		r.channel.Close()
	}
	if r.conn != nil {
		r.conn.Close()
	}
	log.Info().Msg("RabbitMQ connection closed")
}
