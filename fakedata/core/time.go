package core

import (
	"fmt"
	"strings"
	"time"
)

const (
	hoursInDay      = 24
	minutesInHour   = 60
	secondsInMinute = 60
)

func timeGenerator(r *Registry) string {
	hour := r.rng.IntN(hoursInDay)
	minute := r.rng.IntN(minutesInHour)
	second := r.rng.IntN(secondsInMinute)

	return fmt.Sprintf("%02d:%02d:%02d", hour, minute, second)
}

func date(r *Registry, options string) (f func() string, err error) {
	var minDate, maxDate string

	endDate := time.Now()
	startDate := endDate.AddDate(-1, 0, 0)

	dateRange := strings.Split(options, ",")
	minDate = dateRange[0]

	if len(dateRange) > 1 {
		maxDate = dateRange[1]
	}

	if len(minDate) > 0 {
		if len(maxDate) > 0 {
			formattedMax := fmt.Sprintf("%sT00:00:00.000Z", maxDate)

			var d time.Time

			d, err = time.Parse("2006-01-02T15:04:05.000Z", formattedMax)
			if err != nil {
				return nil, fmt.Errorf("problem parsing maxDate date: %v", err)
			}

			endDate = d
		}

		formattedMin := fmt.Sprintf("%sT00:00:00.000Z", minDate)

		var d time.Time

		d, err = time.Parse("2006-01-02T15:04:05.000Z", formattedMin)
		if err != nil {
			return nil, fmt.Errorf("problem parsing mix date: %v", err)
		}

		startDate = d
	}

	if startDate.After(endDate) {
		return nil, fmt.Errorf("%v is after %v", startDate, endDate)
	}

	return func() string {
		n := r.rng.IntN(int(endDate.Sub(startDate)))

		return startDate.Add(time.Duration(n)).Format("2006-01-02")
	}, err
}

func datetimeGenerator(r *Registry, options string) (func() string, error) {
	return dateTimeGenerator(r, "2006-01-02 15:04:05")(options)
}

func timestampGenerator(r *Registry, options string) (func() string, error) {
	return dateTimeGenerator(r, time.RFC3339Nano)(options)
}

func dateTimeGenerator(r *Registry, format string) func(string) (func() string, error) {
	return func(options string) (func() string, error) {
		startDate := time.Now().AddDate(-1, 0, 0)
		endDate := time.Now()

		dateRange := strings.Split(options, ",")
		if len(dateRange) > 1 {
			maxDate, err := time.Parse("2006-01-02", dateRange[1])
			if err != nil {
				return nil, fmt.Errorf("could not parse max date: %v", err)
			}
			endDate = maxDate
		}
		if len(dateRange[0]) > 0 {
			minDate, err := time.Parse("2006-01-02", dateRange[0])
			if err != nil {
				return nil, fmt.Errorf("could not parse min date: %v", err)
			}
			startDate = minDate
		}

		return func() string {
			n := r.rng.Int64N(int64(endDate.Sub(startDate)))

			return startDate.Add(time.Duration(n)).Format(format)
		}, nil
	}
}

func epoch(r *Registry) func() string {
	now := time.Now()

	return func() string {
		v := r.rng.Int64N(now.Unix())

		return fmt.Sprintf("%d", v)
	}
}

func registerTime(r *Registry) {
	r.Register(Generator{Name: "date", Desc: "date in the format YYYY-MM-DD. " +
		"By default, it generates dates in the last year", CustomFunc: func(options string) (func() string, error) {
		return date(r, options)
	}})
	r.Register(Generator{Name: "datetime", Desc: "datetime in the format YYYY-MM-DD HH:MM:SS (without timezone)",
		CustomFunc: func(options string) (func() string, error) { return datetimeGenerator(r, options) }})
	r.Register(Generator{Name: "epoch", Desc: "Unix timestamp between epoch and now", Func: epoch(r)})
	r.Register(Generator{Name: "time", Desc: "time in HH:MM:SS format", Func: func() string { return timeGenerator(r) }})
	r.Register(Generator{Name: "timestamp", Desc: "timestamp in the format YYYY-MM-DDTHH:MM:SS.000Z (with timezone)",
		CustomFunc: func(options string) (func() string, error) { return timestampGenerator(r, options) }})
}
